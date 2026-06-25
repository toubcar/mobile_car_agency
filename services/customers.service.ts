import apiClient from './api';

export interface BackofficeCustomer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  cin?: string;
  city?: string;
  total_rentals: number;
  total_spent: number;
  loyalty_status: string;
  created_at?: string;
}

export interface BackofficeReview {
  id: number;
  user?: string;
  review_type: 'car' | 'agency';
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  target?: string;
  created_at?: string;
}

export interface CustomersResult {
  data: BackofficeCustomer[];
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
  statistics: Record<string, number | string | null>;
}

export interface ReviewsResult {
  data: BackofficeReview[];
  statistics: Record<string, number>;
}

export const customersService = {
  async list(params?: { page?: number; search?: string; status?: string; per_page?: number }): Promise<CustomersResult> {
    const { data } = await apiClient.get<CustomersResult>('/customers', { params });
    return data;
  },

  async get(id: number): Promise<BackofficeCustomer & { rentals?: unknown[] }> {
    const { data } = await apiClient.get<{ data: BackofficeCustomer & { rentals?: unknown[] } }>(`/customers/${id}`);
    return data.data;
  },

  async reviews(params?: { status?: string; review_type?: string; per_page?: number }): Promise<ReviewsResult> {
    const { data } = await apiClient.get<ReviewsResult>('/reviews', { params });
    return data;
  },

  async approveReview(id: number): Promise<BackofficeReview> {
    const { data } = await apiClient.patch<{ data: BackofficeReview }>(`/reviews/${id}/approve`);
    return data.data;
  },

  async rejectReview(id: number): Promise<BackofficeReview> {
    const { data } = await apiClient.patch<{ data: BackofficeReview }>(`/reviews/${id}/reject`);
    return data.data;
  },
};
