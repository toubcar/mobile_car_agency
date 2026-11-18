import apiClient from './api';

export interface AdminSystemHealth {
  health_checks: Record<string, { status: string; message: string; response_time?: string | null; free_space?: string | null }>;
  system_info: Record<string, string | number | null>;
  performance_metrics: Record<string, string | number>;
  maintenance: { is_enabled: boolean; message: string };
}

export interface AdminUsersOverview {
  admins: Array<{ id: number; name: string; email: string; role: string; last_seen_at?: string | null }>;
  roles: Record<string, string>;
  permissions: string[];
  security: Record<string, string | number | boolean>;
  activity_logs: Array<{ id: number; agency_id?: number; type: string; description?: string; created_at?: string }>;
}

export const adminSystemService = {
  async users(): Promise<AdminUsersOverview> {
    const { data } = await apiClient.get<AdminUsersOverview>('/admin/system/users');
    return data;
  },

  async health(): Promise<AdminSystemHealth> {
    const { data } = await apiClient.get<AdminSystemHealth>('/admin/system/health');
    return data;
  },

  async clearCache(): Promise<void> {
    await apiClient.post('/admin/system/cache/clear');
  },

  async optimize(): Promise<void> {
    await apiClient.post('/admin/system/optimize');
  },

  async toggleMaintenance(payload?: { message?: string; allowed_ips?: string }): Promise<{ message: string; is_enabled: boolean }> {
    const { data } = await apiClient.patch<{ message: string; is_enabled: boolean }>('/admin/system/maintenance/toggle', payload ?? {});
    return data;
  },
};
