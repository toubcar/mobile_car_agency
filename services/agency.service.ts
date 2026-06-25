import apiClient from './api';

export type PublicAgency = {
  id: number;
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  years_in_business?: number | null;
  opening_hours?: Array<{
    day?: string;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
  }>;
  profile_picture?: string | null;
  available_cars_count?: number;
  responsable_name?: string | null;
};

export const agencyService = {
  async getPublicProfile(agencyId: number): Promise<PublicAgency> {
    const { data } = await apiClient.get<{ data: PublicAgency }>(`/agencies/${agencyId}/public`);
    return data.data;
  },
};
