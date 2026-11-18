import apiClient from './api';

export interface AgencyDocument {
  type: 'license' | 'insurance' | 'registration' | 'other';
  filename: string;
  path: string;
  description?: string;
  uploaded_at?: string;
}

export interface AgencyProfile {
  id: number;
  agency_name?: string;
  registration_number?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: string | number;
  longitude?: string | number;
  opening_hours?: Array<{ day: string; open_time: string; close_time: string; is_closed?: boolean }>;
  documents?: AgencyDocument[];
  profile_picture?: string;
  status?: string;
  completion?: number;
  /** ToubCar's rate, added to the agency's prices for its customers */
  commission_rate?: number;
}

const unwrapProfile = (body: { data: AgencyProfile } | AgencyProfile): AgencyProfile =>
  'data' in body ? body.data : body;

export const agencyProfileService = {
  async get(): Promise<AgencyProfile> {
    const { data } = await apiClient.get<{ data: AgencyProfile }>('/agence/profile');
    return unwrapProfile(data);
  },

  async updateGeneral(payload: {
    name: string;
    registration_number: string;
    description?: string;
    phone: string;
    email: string;
  }): Promise<AgencyProfile> {
    const { data } = await apiClient.patch<{ data: AgencyProfile }>('/agence/profile/general', payload);
    return data.data;
  },

  async updateOpeningHours(opening_hours: AgencyProfile['opening_hours']): Promise<AgencyProfile> {
    const { data } = await apiClient.patch<{ data: AgencyProfile }>('/agence/profile/opening-hours', { opening_hours });
    return data.data;
  },

  async updateLocations(payload: {
    address: string;
    city: string;
    postal_code: string;
    country: string;
    latitude?: number;
    longitude?: number;
  }): Promise<AgencyProfile> {
    const { data } = await apiClient.patch<{ data: AgencyProfile }>('/agence/profile/locations', payload);
    return data.data;
  },

  async deleteDocument(index: number): Promise<AgencyProfile> {
    const { data } = await apiClient.delete<{ data: AgencyProfile }>(`/agence/profile/documents/${index}`);
    return data.data;
  },

  /** `POST /agence/profile/documents` — même contrat que `AgencyProfileMobileController::uploadDocument` */
  async uploadDocument(payload: {
    document_type: AgencyDocument['type'];
    description?: string;
    file: { uri: string; name: string; type: string };
  }): Promise<AgencyProfile> {
    const form = new FormData();
    form.append('document_type', payload.document_type);
    if (payload.description) form.append('description', payload.description);
    form.append('document', { uri: payload.file.uri, name: payload.file.name, type: payload.file.type } as unknown as Blob);
    const { data } = await apiClient.post<{ data: AgencyProfile }>('/agence/profile/documents', form);
    return data.data;
  },

  async updateSecurity(payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> {
    await apiClient.patch('/agence/profile/security', payload);
  },
};
