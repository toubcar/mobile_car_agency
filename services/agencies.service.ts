import apiClient from './api';
import type { PaginatedResponse, PartnerAgency } from '@/types';

export interface AgencyStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

export interface AgenciesResult extends PaginatedResponse<PartnerAgency> {
  statistics: AgencyStatistics;
}

const emptyStats: AgencyStatistics = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  suspended: 0,
};

function parseList(body: unknown): PartnerAgency[] {
  if (body == null) return [];
  if (Array.isArray(body)) return body as PartnerAgency[];
  if (typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  const inner = o.data;
  if (Array.isArray(inner)) return inner as PartnerAgency[];
  if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
    return (inner as { data: PartnerAgency[] }).data;
  }
  return [];
}

function parsePaginated(body: unknown): AgenciesResult {
  const list = parseList(body);
  if (!body || typeof body !== 'object') {
    return { data: list, current_page: 1, last_page: 1, per_page: list.length || 15, total: list.length, statistics: emptyStats };
  }

  const o = body as Record<string, unknown>;
  const meta = (o.meta && typeof o.meta === 'object' ? o.meta : o) as Record<string, unknown>;
  const stats = (o.statistics && typeof o.statistics === 'object' ? o.statistics : {}) as Partial<AgencyStatistics>;

  return {
    data: list,
    current_page: Number(meta.current_page) || 1,
    last_page: Number(meta.last_page) || 1,
    per_page: Number(meta.per_page) || list.length || 15,
    total: Number(meta.total) || list.length,
    statistics: {
      total: Number(stats.total) || 0,
      pending: Number(stats.pending) || 0,
      approved: Number(stats.approved) || 0,
      rejected: Number(stats.rejected) || 0,
      suspended: Number(stats.suspended) || 0,
    },
  };
}

/** Liste des agences — `GET /api/admin/agencies` (comme le back-office web) */
export const agenciesService = {
  async list(params?: { page?: number; search?: string; status?: string }): Promise<AgenciesResult> {
    const { data } = await apiClient.get('/admin/agencies', { params });
    return parsePaginated(data);
  },

  async get(id: number): Promise<PartnerAgency> {
    const { data } = await apiClient.get<{ data: PartnerAgency }>(`/admin/agencies/${id}`);
    return data.data;
  },

  async approve(id: number, commissionRate = 10): Promise<PartnerAgency> {
    const { data } = await apiClient.patch<{ data: PartnerAgency }>(`/admin/agencies/${id}/approve`, {
      commission_rate: commissionRate,
    });
    return data.data;
  },

  async reject(id: number, reason: string): Promise<PartnerAgency> {
    const { data } = await apiClient.patch<{ data: PartnerAgency }>(`/admin/agencies/${id}/reject`, {
      rejection_reason: reason,
    });
    return data.data;
  },

  async suspend(id: number, reason: string): Promise<PartnerAgency> {
    const { data } = await apiClient.patch<{ data: PartnerAgency }>(`/admin/agencies/${id}/suspend`, {
      suspension_reason: reason,
    });
    return data.data;
  },

  async unsuspend(id: number): Promise<PartnerAgency> {
    const { data } = await apiClient.patch<{ data: PartnerAgency }>(`/admin/agencies/${id}/unsuspend`);
    return data.data;
  },

  async updateCommission(id: number, commissionRate: number): Promise<PartnerAgency> {
    const { data } = await apiClient.patch<{ data: PartnerAgency }>(`/admin/agencies/${id}/commission`, {
      commission_rate: commissionRate,
    });
    return data.data;
  },
};
