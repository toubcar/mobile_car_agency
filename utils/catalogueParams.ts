import type { CatalogueSort, SearchParams } from '@/types';

/**
 * L'état des filtres du catalogue, tel qu'il circule entre l'écran de filtres et l'écran de résultats
 * (paramètres de route : uniquement des chaînes) et tel qu'il part vers l'API (`GET /cars`).
 */
export interface CatalogueQuery {
  q?: string;
  location?: string;
  category?: string;
  brand?: string;
  start_date?: string;
  end_date?: string;
  min_price?: number;
  max_price?: number;
  seats?: number;
  transmission?: string[];
  fuel_type?: string[];
  sort?: CatalogueSort;
}

type RouteParams = Record<string, string | string[] | undefined>;

const SORTS: CatalogueSort[] = ['default', 'newest', 'price_asc', 'price_desc', 'rating_desc'];

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== '' ? v.trim() : undefined;
}

function list(value: string | string[] | undefined): string[] | undefined {
  const raw = first(value);
  const items = raw ? raw.split(',').map((x) => x.trim()).filter(Boolean) : [];
  return items.length ? items : undefined;
}

function positive(value: string | string[] | undefined): number | undefined {
  const n = Number(first(value));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function queryFromRoute(params: RouteParams): CatalogueQuery {
  const sort = first(params.sort) as CatalogueSort | undefined;

  return {
    q: first(params.q),
    location: first(params.location),
    category: first(params.category),
    brand: first(params.brand),
    start_date: first(params.start_date),
    end_date: first(params.end_date),
    min_price: positive(params.min_price),
    max_price: positive(params.max_price),
    seats: positive(params.seats),
    transmission: list(params.transmission),
    fuel_type: list(params.fuel_type),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
  };
}

/** Paramètres de route : uniquement ce qui est renseigné. */
export function routeFromQuery(query: CatalogueQuery): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else if (!(key === 'sort' && value === 'default')) {
      out[key] = String(value);
    }
  }

  return out;
}

/** Paramètres de `GET /cars`. */
export function apiParamsFromQuery(query: CatalogueQuery): SearchParams {
  return { ...query, per_page: 20 };
}

/** Combien de filtres sont actifs (hors tri et recherche libre) : pour le badge du bouton « Filtres ». */
export function activeFilterCount(query: CatalogueQuery): number {
  return [
    query.location,
    query.category,
    query.brand,
    query.start_date && query.end_date ? 'dates' : undefined,
    query.min_price ?? query.max_price,
    query.seats,
    query.transmission?.length ? 'transmission' : undefined,
    query.fuel_type?.length ? 'fuel' : undefined,
  ].filter((v) => v !== undefined && v !== '').length;
}
