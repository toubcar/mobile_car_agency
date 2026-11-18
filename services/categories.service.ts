import apiClient from './api';

export interface AgencyCategory {
  id: number;
  name: string;
  /** The name in the app's language when it is one of ToubCar's */
  label: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
  sort_order: number;
  /** The agency's own cars in this category */
  cars_count: number;
  /** Created by this agency: it may change or delete it (the others are shared by every agency) */
  editable: boolean;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}

export const CATEGORY_ICONS = ['car', 'suv', 'luxury', 'economy', 'hatchback', 'sedan', 'convertible', 'truck'] as const;

/** Car categories, shared by every agency (website: Flotte > Catégories) */
export const categoriesService = {
  async list(): Promise<AgencyCategory[]> {
    const { data } = await apiClient.get<{ data: AgencyCategory[] }>('/agence/categories');
    return data.data ?? [];
  },

  async create(payload: CategoryPayload): Promise<AgencyCategory> {
    const { data } = await apiClient.post<{ data: AgencyCategory }>('/agence/categories', payload);
    return data.data;
  },

  async update(id: number, payload: CategoryPayload): Promise<AgencyCategory> {
    const { data } = await apiClient.put<{ data: AgencyCategory }>(`/agence/categories/${id}`, payload);
    return data.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/agence/categories/${id}`);
  },
};
