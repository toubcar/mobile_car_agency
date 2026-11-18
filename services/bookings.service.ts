import apiClient from './api';
import { Booking, BookingQuote, Car, CarReview, PaginatedResponse, User, type AdminBookingStatistics } from '../types';
import { toAmount } from '@/utils/money';

export interface PaymentStart {
  approve_url: string;
  order_id: string;
  /** Montant débité par PayPal (en euros, comme sur le site) */
  amount: number;
  currency: string;
  amount_mad: number;
}

export interface AdminBookingsResult extends PaginatedResponse<Booking> {
  statistics: AdminBookingStatistics;
}

const emptyBookingStats: AdminBookingStatistics = {
  total: 0,
  pending: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  revenue: 0,
};

function parseBookingStatistics(raw: unknown): AdminBookingStatistics {
  if (!raw || typeof raw !== 'object') return emptyBookingStats;
  const s = raw as Record<string, unknown>;
  return {
    total: Number(s.total) || 0,
    pending: Number(s.pending) || 0,
    active: Number(s.active) || 0,
    completed: Number(s.completed) || 0,
    cancelled: Number(s.cancelled) || 0,
    revenue: toAmount(s.revenue),
  };
}

/** Statuts Laravel API (`car-agency` BookingController) → modèle UI mobile */
function mapApiRentalStatus(status: string): Booking['status'] {
  if (status === 'active') return 'confirmed';
  if (status === 'rejected') return 'cancelled';
  if (status === 'pending' || status === 'confirmed' || status === 'cancelled' || status === 'completed') {
    return status;
  }
  return 'pending';
}

function rentalPayloadToCar(carRaw: unknown, agencyRaw: unknown): Car {
  const c = (carRaw && typeof carRaw === 'object' ? carRaw : {}) as Record<string, unknown>;
  const a = (agencyRaw && typeof agencyRaw === 'object' ? agencyRaw : {}) as Record<string, unknown>;
  const name = String(c.name ?? '');
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const brand = tokens[0] ?? '—';
  const model = tokens.length > 1 ? tokens.slice(1).join(' ') : brand;

  const images = Array.isArray(c.images) ? (c.images as string[]) : [];

  return {
    id: Number(c.id) || 0,
    name: name || `${brand} ${model}`,
    brand,
    model,
    registration_number: c.registration_number != null ? String(c.registration_number) : undefined,
    year: Number(c.year) || new Date().getFullYear(),
    category: (c.category as Car['category']) ?? 'Economy',
    price_per_day: Number(c.price_per_day) || 0,
    location: a.city != null ? String(a.city) : '',
    rating: Number(c.rating) || 0,
    reviews_count: Number(c.reviews_count) || 0,
    images,
    description: c.description != null ? String(c.description) : undefined,
    seats: Number(c.seats) || 5,
    transmission: (c.transmission as Car['transmission']) ?? 'automatic',
    fuel_type: c.fuel_type != null ? String(c.fuel_type) : '',
    is_available: true,
  };
}

/** Normalise une location renvoyée par `GET/POST /bookings` (API Laravel). */
function normalizeClientRental(raw: unknown, viewer: User | null): Booking {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const car = rentalPayloadToCar(r.car, r.agency);
  const agency = (r.agency && typeof r.agency === 'object' ? r.agency : {}) as Record<string, unknown>;
  if (!car.location && agency.city) {
    car.location = String(agency.city);
  }

  const vu =
    viewer ??
    ({
      id: 0,
      name: 'Client',
      email: '',
      role: 'client',
      created_at: new Date().toISOString(),
    } as User);

  return {
    id: Number(r.id) || 0,
    car,
    user: vu,
    start_date: String(r.start_date ?? ''),
    end_date: String(r.end_date ?? ''),
    total_price: Number(r.total_price) || 0,
    status: mapApiRentalStatus(String(r.status ?? 'pending')),
    payment_status: (r.payment_status as Booking['payment_status']) ?? 'unpaid',
    status_label: r.status_label != null ? String(r.status_label) : undefined,
    pay_before: typeof r.pay_before === 'string' ? r.pay_before : null,
    can_pay: r.can_pay === true,
    can_cancel: r.can_cancel === true,
    can_review: r.can_review === true,
    review: r.review && typeof r.review === 'object' ? (r.review as CarReview) : null,
    cancelled_by: (r.cancelled_by as Booking['cancelled_by']) ?? null,
    agency: agency.id != null ? { id: Number(agency.id), name: String(agency.name ?? ''), city: agency.city != null ? String(agency.city) : null } : null,
    notes: r.notes != null ? String(r.notes) : undefined,
    created_at:
      typeof r.created_at === 'string'
        ? r.created_at.includes('T')
          ? r.created_at
          : `${String(r.created_at).replace(' ', 'T')}`
        : new Date().toISOString(),
  };
}

export const bookingsService = {
  // ── Client (routes/api.php — même contrat que car-agency) ───────────────
  async getBookings(viewer?: User | null): Promise<Booking[]> {
    const response = await apiClient.get<{ data: unknown[] }>('/bookings');
    const rows = Array.isArray(response.data.data) ? response.data.data : [];
    return rows.map((row) => normalizeClientRental(row, viewer ?? null));
  },

  async getBooking(id: number, viewer?: User | null): Promise<Booking> {
    const response = await apiClient.get<{ data: unknown }>(`/bookings/${id}`);
    return normalizeClientRental(response.data.data, viewer ?? null);
  },

  async getQuote(params: { car_id: number; start_date: string; end_date: string }): Promise<BookingQuote> {
    const { data } = await apiClient.get<{ data: unknown }>('/bookings/quote', { params });
    const row = (data?.data ?? data) as Record<string, unknown>;
    return {
      car_id: Number(row.car_id) || params.car_id,
      start_date: String(row.start_date ?? params.start_date),
      end_date: String(row.end_date ?? params.end_date),
      days: Number(row.days) || 0,
      price_per_day: toAmount(row.price_per_day),
      total_price: toAmount(row.total_price),
    };
  },

  async createBooking(data: { car_id: number; start_date: string; end_date: string }, viewer?: User | null): Promise<Booking> {
    const response = await apiClient.post<{ data: unknown }>('/bookings', data);
    return normalizeClientRental(response.data.data, viewer ?? null);
  },

  /** Annule une demande ou une réservation confirmée (ce qui a été payé en ligne n'est pas remboursé : politique d'annulation). */
  async cancelBooking(id: number): Promise<string | undefined> {
    const { data } = await apiClient.delete<{ message?: string }>(`/bookings/${id}`);
    return data?.message;
  },

  /** Paiement PayPal, le même que sur le site : l'adresse de la page PayPal, à ouvrir dans le navigateur intégré. */
  async startPayment(id: number, returnUrl: string): Promise<PaymentStart> {
    const { data } = await apiClient.post<{ data: PaymentStart }>(`/bookings/${id}/payment`, { return_url: returnUrl });
    return data.data;
  },

  /** Retour de PayPal sans confirmation (navigateur fermé trop tôt) : le serveur vérifie le paiement auprès de PayPal. */
  async capturePayment(id: number): Promise<{ status: 'paid'; booking_status: string }> {
    const { data } = await apiClient.post<{ data: { status: 'paid'; booking_status: string } }>(`/bookings/${id}/payment/capture`);
    return data.data;
  },

  /** L'avis du client sur sa location terminée (publié aussitôt, l'agence peut y répondre). */
  async review(id: number, payload: { rating: number; title?: string; comment?: string }): Promise<{ message: string; data: CarReview }> {
    const { data } = await apiClient.post<{ message: string; data: CarReview }>(`/bookings/${id}/review`, payload);
    return data;
  },

  /** Agence : un lien vers la facture imprimable, valable 30 minutes, à ouvrir dans le navigateur. */
  async invoiceLink(id: number): Promise<string> {
    const { data } = await apiClient.get<{ url: string }>(`/agence/bookings/${id}/invoice`);
    return data.url;
  },

  // ── Admin / Agence ───────────────────────────────────────────────────────
  async getAll(page = 1, status = ''): Promise<AdminBookingsResult> {
    const { data } = await apiClient.get('/admin/bookings', { params: { page, status } });
    const body = data as Record<string, unknown>;
    return {
      data: Array.isArray(body.data) ? (body.data as Booking[]) : [],
      current_page: Number(body.current_page) || 1,
      last_page: Number(body.last_page) || 1,
      per_page: Number(body.per_page) || 15,
      total: Number(body.total) || 0,
      statistics: parseBookingStatistics(body.statistics),
    };
  },

  async getById(id: number): Promise<Booking> {
    const { data } = await apiClient.get(`/admin/bookings/${id}`);
    return data.data;
  },

  async updateStatus(id: number, status: Booking['status']): Promise<Booking> {
    const { data } = await apiClient.patch(`/admin/bookings/${id}/status`, { status });
    return data.data;
  },

  async confirm(id: number): Promise<Booking> {
    return this.updateStatus(id, 'confirmed');
  },

  async complete(id: number): Promise<Booking> {
    return this.updateStatus(id, 'completed');
  },

  async reject(id: number): Promise<Booking> {
    return this.updateStatus(id, 'cancelled');
  },
};
