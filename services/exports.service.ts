import apiClient from './api';

export type AdminExportType = 'commissions' | 'agencies' | 'customers' | 'vehicles' | 'bookings' | 'transactions';

/** The admin's CSV exports: a link valid 10 minutes, opened in the browser which downloads the file */
export const exportsService = {
  async adminLink(type: AdminExportType, range?: { date_from?: string; date_to?: string }): Promise<string> {
    const { data } = await apiClient.post<{ url: string }>('/admin/exports', { type, ...range });
    return data.url;
  },
};
