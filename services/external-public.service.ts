import apiClient from './api';

export interface ExternalAvailabilityPayload {
  registration_number?: string;
  car_identifier?: string;
  start_date?: string;
  end_date?: string;
}

export interface ExternalSiteRegisterPayload {
  site_name: string;
  site_url: string;
  api_url: string;
  registration_number: string;
  api_token?: string;
  external_car_id?: string;
}

export const externalPublicService = {
  async checkAvailability(payload: ExternalAvailabilityPayload): Promise<unknown> {
    const { data } = await apiClient.post('/cars/check-availability', payload);
    return data;
  },

  async registerSite(payload: ExternalSiteRegisterPayload): Promise<unknown> {
    const { data } = await apiClient.post('/external-sites/register', payload);
    return data;
  },

  async listSitesForCar(registrationNumber: string): Promise<unknown> {
    const { data } = await apiClient.get(`/cars/${encodeURIComponent(registrationNumber)}/external-sites`);
    return data;
  },
};
