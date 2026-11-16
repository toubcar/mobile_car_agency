import apiClient from './api';
import type { User } from '../types';

export type ClientPreferences = {
  preferred_language?: string;
  notifications_email?: boolean;
  notifications_sms?: boolean;
  marketing_emails?: boolean;
  mobile?: Record<string, boolean>;
  [key: string]: unknown;
};

/** Le profil complet (`GET /profile`) : ce que contient la page profil du site. */
export interface ProfileData extends User {
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  nationality?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  cin?: string | null;
  date_of_birth?: string | null;
  driving_license_number?: string | null;
  driving_license_expiry?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  /** Documents envoyés : type → adresse du fichier. */
  documents?: Record<string, string>;
}

export type DocumentType = 'cin_document' | 'driving_license_document' | 'identity_document';

/** Un fichier choisi sur le téléphone, prêt à être envoyé. */
export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

function fileForm(fields: Record<string, PickedFile>): FormData {
  const form = new FormData();
  for (const [name, file] of Object.entries(fields)) {
    form.append(name, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  return form;
}

export const profileService = {
  async get(): Promise<ProfileData> {
    const { data } = await apiClient.get<{ data: ProfileData }>('/profile');
    return data.data;
  },

  async update(payload: Partial<Omit<ProfileData, 'id' | 'role' | 'email' | 'documents' | 'avatar'>>): Promise<ProfileData> {
    const { data } = await apiClient.put<{ data: ProfileData }>('/profile', payload);
    return data.data;
  },

  async changePassword(current_password: string, password: string, password_confirmation: string): Promise<string> {
    const { data } = await apiClient.put<{ message: string }>('/profile/password', { current_password, password, password_confirmation });
    return data.message;
  },

  async uploadPicture(file: PickedFile): Promise<ProfileData> {
    const { data } = await apiClient.post<{ data: ProfileData }>('/profile/picture', fileForm({ profile_picture: file }));
    return data.data;
  },

  async deletePicture(): Promise<ProfileData> {
    const { data } = await apiClient.delete<{ data: ProfileData }>('/profile/picture');
    return data.data;
  },

  async uploadDocument(type: DocumentType, file: PickedFile): Promise<ProfileData> {
    const { data } = await apiClient.post<{ data: ProfileData }>('/profile/documents', fileForm({ [type]: file }));
    return data.data;
  },

  async deleteDocument(type: DocumentType): Promise<ProfileData> {
    const { data } = await apiClient.delete<{ data: ProfileData }>(`/profile/documents/${type}`);
    return data.data;
  },

  async getPreferences(): Promise<ClientPreferences> {
    const { data } = await apiClient.get<{ data: ClientPreferences }>('/profile/preferences');
    return data.data ?? {};
  },

  async updatePreferences(prefs: Partial<ClientPreferences>): Promise<ClientPreferences> {
    const { data } = await apiClient.patch<{ data: ClientPreferences }>('/profile/preferences', prefs);
    return data.data ?? {};
  },
};
