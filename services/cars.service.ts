import apiClient from './api';
import { Car, CarAvailability, CarReviewsResult, CatalogueFilters, PaginatedResponse, SearchParams } from '../types';
import { normalizeCarImages } from '@/utils/carImages';

type BackofficeScope = 'admin' | 'agence';

/** Laravel / custom APIs often wrap paginated JSON differently — normalize to a stable shape. */
function normalizePaginatedCars(body: unknown): PaginatedResponse<Car> {
  const empty: PaginatedResponse<Car> = {
    data: [], current_page: 1, last_page: 1, per_page: 15, total: 0,
  };
  if (body == null || typeof body !== 'object') return empty;

  const o = body as Record<string, unknown>;

  // { data: Car[], current_page, ... } — standard Laravel paginator JSON
  if (Array.isArray(o.data)) {
    const list = (o.data as Car[]).map(withNormalizedImages);
    return {
      data: list,
      current_page: Number(o.current_page) || 1,
      last_page: Number(o.last_page) || 1,
      per_page: Number(o.per_page) || list.length || 15,
      total: Number(o.total) ?? list.length,
    };
  }

  // { data: { data: Car[], ...pagination } } — nested resource wrapper
  const inner = o.data;
  if (inner && typeof inner === 'object') {
    const inn = inner as Record<string, unknown>;
    if (Array.isArray(inn.data)) {
      const list = (inn.data as Car[]).map(withNormalizedImages);
      return {
        data: list,
        current_page: Number(inn.current_page) || 1,
        last_page: Number(inn.last_page) || 1,
        per_page: Number(inn.per_page) || list.length || 15,
        total: Number(inn.total) ?? list.length,
      };
    }
  }

  // { success: true, data: Car[] }
  if (o.success === true && Array.isArray(o.data)) {
    const list = (o.data as Car[]).map(withNormalizedImages);
    return { data: list, current_page: 1, last_page: 1, per_page: list.length || 15, total: list.length };
  }

  return empty;
}

/** Featured / list endpoints: array at root, or { data: [] }, or nested. */
function withNormalizedImages(car: Car): Car {
  const extra = car as Car & { image?: string; photos?: unknown };
  return {
    ...car,
    images: normalizeCarImages(car.images, extra.image ?? extra.photos),
  };
}

function normalizeCarArray(body: unknown): Car[] {
  if (body == null) return [];
  if (Array.isArray(body)) return (body as Car[]).map(withNormalizedImages);
  if (typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.data)) return (o.data as Car[]).map(withNormalizedImages);
  if (o.data && typeof o.data === 'object') {
    const inner = (o.data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return (inner as Car[]).map(withNormalizedImages);
  }
  return [];
}

export const carsService = {
  async getCars(params?: SearchParams & { page?: number }): Promise<PaginatedResponse<Car>> {
    const response = await apiClient.get('/cars', { params });
    return normalizePaginatedCars(response.data);
  },

  /** Les options de l'écran de filtres : marques, catégories, villes, fourchette de prix… */
  async getFilters(): Promise<CatalogueFilters> {
    const { data } = await apiClient.get<{ data: CatalogueFilters }>('/cars/filters');
    return data.data;
  },

  /** Avis publiés d'un véhicule. */
  async getReviews(carId: number, page = 1): Promise<CarReviewsResult> {
    const { data } = await apiClient.get<CarReviewsResult>(`/cars/${carId}/reviews`, { params: { page } });
    return data;
  },

  /** Les jours où le véhicule ne peut pas être pris (réservé ou au garage), entre deux dates Y-m-d. */
  async getAvailability(carId: number, from: string, to: string): Promise<CarAvailability> {
    const { data } = await apiClient.get<{ data: CarAvailability }>(`/cars/${carId}/availability`, { params: { from, to } });
    return data.data;
  },

  /** Laisse un avis sur une location terminée de ce véhicule : il est publié aussitôt. */
  async postReview(carId: number, rating: number, comment?: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/cars/${carId}/reviews`, { rating, comment: comment || undefined });
    return data;
  },

  async getCar(id: number): Promise<Car> {
    const response = await apiClient.get<{ data: Car }>(`/cars/${id}`);
    const root = response.data as unknown;
    const raw =
      root && typeof root === 'object' && 'data' in (root as object)
        ? (root as { data: Car }).data
        : (root as Car);
    const extra = raw as Car & { image?: string; photos?: unknown };
    return {
      ...raw,
      images: normalizeCarImages(raw.images, extra.image ?? extra.photos),
    };
  },

  /** Détail back-office — `GET /admin|agence/cars/{id}` */
  async getScoped(id: number, scope: BackofficeScope = 'admin'): Promise<Car> {
    const { data } = await apiClient.get<{ data: Car }>(`/${scope}/cars/${id}`);
    return data.data;
  },

  /** Filtres sur la liste paginée — le backend expose `GET /cars` (pas `/cars/search`). */
  async searchCars(params: SearchParams): Promise<Car[]> {
    const response = await apiClient.get('/cars', { params });
    const paginated = normalizePaginatedCars(response.data);
    return paginated.data;
  },

  async getFeaturedCars(): Promise<Car[]> {
    const response = await apiClient.get('/cars/featured');
    return normalizeCarArray(response.data);
  },

  async toggleFavorite(carId: number): Promise<{ is_favorite: boolean }> {
    const { data } = await apiClient.post<{ is_favorite?: boolean; message?: string }>(
      `/cars/${carId}/favorite`,
    );
    return { is_favorite: Boolean(data.is_favorite) };
  },

  async getFavorites(): Promise<Car[]> {
    const response = await apiClient.get('/favorites');
    return normalizeCarArray(response.data);
  },

  // ── Admin / Agence ───────────────────────
  async getAll(page = 1, search = '', scope: BackofficeScope = 'admin'): Promise<PaginatedResponse<Car>> {
    const { data } = await apiClient.get(`/${scope}/cars`, { params: { page, search } });
    return data;
  },

  /** The agency's whole fleet (up to 100 cars), for the pickers of the maintenance and offer forms */
  async listOwn(): Promise<Array<Car & { customer_price_per_day?: number; commission_rate?: number }>> {
    const { data } = await apiClient.get<{ data: Array<Car & { customer_price_per_day?: number; commission_rate?: number }> }>('/agence/cars', { params: { per_page: 100 } });
    return data.data ?? [];
  },

  async create(payload: Partial<Car>, scope: BackofficeScope = 'admin'): Promise<Car> {
    const { data } = await apiClient.post(`/${scope}/cars`, toBackofficePayload(payload));
    return data.data;
  },

  async update(id: number, payload: Partial<Car>, scope: BackofficeScope = 'admin'): Promise<Car> {
    const { data } = await apiClient.put(`/${scope}/cars/${id}`, toBackofficePayload(payload));
    return data.data;
  },

  async delete(id: number, scope: BackofficeScope = 'admin'): Promise<void> {
    await apiClient.delete(`/${scope}/cars/${id}`);
  },

  async toggleAvailability(id: number, scope: BackofficeScope = 'admin'): Promise<Car> {
    const { data } = await apiClient.patch(`/${scope}/cars/${id}/toggle-availability`);
    return data.data;
  },

  async updateFleetStatus(id: number, status: 'available' | 'rented' | 'maintenance'): Promise<Car> {
    const { data } = await apiClient.patch(`/fleet/cars/${id}/status`, { status });
    return data.data;
  },
};

function toBackofficePayload(payload: Partial<Car>): Partial<Car> {
  return {
    ...payload,
    status: payload.status ?? (payload.is_available === false ? 'maintenance' : 'available'),
  };
}
