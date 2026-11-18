import apiClient from './api';

export interface ExternalSiteRecord {
  id: number;
  car_id: number;
  site_name: string;
  site_url: string;
  api_url: string;
  external_car_id?: string;
  is_active: boolean;
  notes?: string;
}

export const externalSitesService = {
  /** The external sites of the agency's cars (of one car with carId) */
  async list(carId?: number): Promise<Array<ExternalSiteRecord & { car?: { id: number; name: string } | null }>> {
    const { data } = await apiClient.get<{ data: Array<ExternalSiteRecord & { car?: { id: number; name: string } | null }> }>('/fleet/external-sites', {
      params: carId ? { car_id: carId } : undefined,
    });
    return data.data ?? [];
  },

  async create(carId: number, payload: {
    site_name: string;
    site_url: string;
    api_url: string;
    api_token?: string;
    external_car_id?: string;
    is_active?: boolean;
    notes?: string;
  }): Promise<ExternalSiteRecord> {
    const { data } = await apiClient.post<{ data: ExternalSiteRecord }>(`/fleet/cars/${carId}/external-sites`, payload);
    return data.data;
  },

  async update(id: number, payload: Partial<ExternalSiteRecord> & { api_token?: string }): Promise<ExternalSiteRecord> {
    const { data } = await apiClient.put<{ data: ExternalSiteRecord }>(`/fleet/external-sites/${id}`, payload);
    return data.data;
  },

  async toggle(id: number): Promise<ExternalSiteRecord> {
    const { data } = await apiClient.patch<{ data: ExternalSiteRecord }>(`/fleet/external-sites/${id}/toggle`);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/fleet/external-sites/${id}`);
  },
};
