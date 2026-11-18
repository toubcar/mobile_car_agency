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

export interface CustomersResult {
  data: BackofficeCustomer[];
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
  statistics: Record<string, number | string | null>;
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
};
