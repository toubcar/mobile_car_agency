import apiClient from './api';

export type ClientPreferences = {
  preferred_language?: string;
  notifications_email?: boolean;
  notifications_sms?: boolean;
  marketing_emails?: boolean;
  mobile?: Record<string, boolean>;
  [key: string]: unknown;
};

export const profileService = {
  async getPreferences(): Promise<ClientPreferences> {
    const { data } = await apiClient.get<{ data: ClientPreferences }>('/profile/preferences');
    return data.data ?? {};
  },

  async updatePreferences(prefs: Partial<ClientPreferences>): Promise<ClientPreferences> {
    const { data } = await apiClient.patch<{ data: ClientPreferences }>('/profile/preferences', prefs);
    return data.data ?? {};
  },
};
