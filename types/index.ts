export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'client' | 'agence' | 'admin';
  /** Email vérifié (Laravel) */
  is_verified?: boolean;
  /** L'adresse e-mail est confirmée (les comptes Google, Apple et téléphone le sont d'office). */
  email_verified?: boolean;
  /** Langue du compte (celle des e-mails, SMS et notifications). */
  locale?: 'fr' | 'en' | 'ar';
  /** Agence : sa situation, pour afficher « en attente », « rejetée » ou « suspendue » à la place de l'espace pro. */
  agency?: UserAgencyStatus | null;
  /** Présent sur le profil API ; parfois absent juste après login. */
  created_at?: string;
}

export interface UserAgencyStatus {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string | null;
  suspension_reason?: string | null;
  tries_count?: number;
  max_tries?: number;
}

export interface Car {
  id: number;
  name: string;
  brand: string;
  model: string;
  registration_number?: string;
  year: number;
  category: 'Economy' | 'Sedan' | 'SUV' | 'Luxury' | 'Hatchback' | 'Convertible';
  category_id?: number;
  price_per_day: number;
  location: string;
  rating: number;
  reviews_count: number;
  images: string[];
  description?: string;
  seats: number;
  transmission: 'automatic' | 'manual';
  fuel_type: string;
  status?: 'available' | 'rented' | 'maintenance';
  is_available: boolean;
  agency_id?: number;
  is_favorite?: boolean;
  owner?: User;
}

export interface Booking {
  id: number;
  car: Car;
  user: User;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  notes?: string;
  created_at: string;
}

/** Devis serveur — `GET /bookings/quote` (même calcul que POST /bookings). */
export interface BookingQuote {
  car_id: number;
  start_date: string;
  end_date: string;
  days: number;
  price_per_day: number;
  total_price: number;
}

/** Agence / partenaire (back-office ToubCar) */
export interface PartnerAgency {
  id: number;
  name: string;
  agency_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  responsable_name?: string;
  registration_number?: string;
  commercial_register_number?: string;
  tax_number?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string;
  tries_count?: number;
  commission_rate?: number;
  is_suspended?: boolean;
  suspension_reason?: string;
  cancellation_count?: number;
  max_cancellations?: number;
  cars_count?: number;
  bookings_count?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

/** Statistiques globales renvoyées par `GET /admin/bookings` (Laravel AdminBookingController). */
export interface AdminBookingStatistics {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

/** Statistiques globales renvoyées par `GET /admin/users` (Laravel). */
export interface AdminUserStatistics {
  total: number;
  admins: number;
  verified: number;
  unverified: number;
}

export type CatalogueSort = 'default' | 'newest' | 'price_asc' | 'price_desc' | 'rating_desc';

/** Paramètres de `GET /cars` — les mêmes filtres que le catalogue du site. */
export interface SearchParams {
  /** Texte libre : marque, modèle, ville ou quartier. */
  q?: string;
  /** Ville ou adresse (le « où » du site). */
  location?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  brand?: string;
  transmission?: string[];
  fuel_type?: string[];
  /** Nombre de places minimum. */
  seats?: number;
  /** Prix client par jour. */
  min_price?: number;
  max_price?: number;
  sort?: CatalogueSort;
  per_page?: number;
}

/** `GET /cars/filters` — ce qui existe dans le catalogue en ce moment. */
export interface CatalogueFilters {
  brands: string[];
  categories: { id: number; name: string }[];
  transmissions: string[];
  fuel_types: string[];
  cities: string[];
  max_seats: number;
  min_price: number;
  max_price: number;
  sorts: CatalogueSort[];
}

export interface CarReview {
  id: number;
  author: string;
  rating: number;
  comment?: string | null;
  status?: string;
  created_at?: string;
}

export interface CarReviewsResult {
  data: CarReview[];
  summary: { average: number; count: number; distribution: Record<string, number> };
  current_page: number;
  last_page: number;
  total: number;
}
