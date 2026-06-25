import apiClient from './api';
import type { User, PaginatedResponse, AdminUserStatistics } from '@/types';

export interface AdminUsersResult extends PaginatedResponse<User> {
  statistics: AdminUserStatistics;
}

const emptyUserStats: AdminUserStatistics = {
  total: 0,
  admins: 0,
  verified: 0,
  unverified: 0,
};

function parseUserStatistics(raw: unknown): AdminUserStatistics {
  if (!raw || typeof raw !== 'object') return emptyUserStats;
  const s = raw as Record<string, unknown>;
  return {
    total: Number(s.total) || 0,
    admins: Number(s.admins) || 0,
    verified: Number(s.verified) || 0,
    unverified: Number(s.unverified) || 0,
  };
}

export const usersService = {
  async getAll(page = 1, search = ''): Promise<AdminUsersResult> {
    const { data } = await apiClient.get('/admin/users', { params: { page, search } });
    const body = data as Record<string, unknown>;
    return {
      data: Array.isArray(body.data) ? (body.data as User[]) : [],
      current_page: Number(body.current_page) || 1,
      last_page: Number(body.last_page) || 1,
      per_page: Number(body.per_page) || 20,
      total: Number(body.total) || 0,
      statistics: parseUserStatistics(body.statistics),
    };
  },

  async getById(id: number): Promise<User> {
    const { data } = await apiClient.get(`/admin/users/${id}`);
    return data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  async toggleVerification(id: number): Promise<User> {
    const { data } = await apiClient.patch(`/admin/users/${id}/toggle-verify`);
    return data.data;
  },
};
