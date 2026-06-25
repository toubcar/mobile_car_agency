import apiClient from './api';
import type { PaginatedResponse } from '@/types';

export interface SupportTicket {
  id: number;
  ticket_number?: string;
  subject: string;
  message?: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  agency?: { id: number; name: string } | null;
  client_id?: number | null;
  rental_id?: number | null;
  replies?: Array<{ user_id: number; user_type: string; message: string; created_at: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface SupportStatistics {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  urgent: number;
}

export interface SupportTicketsResult extends PaginatedResponse<SupportTicket> {
  statistics?: SupportStatistics;
}

export const supportService = {
  async list(params?: { page?: number; status?: string; priority?: string; search?: string }): Promise<SupportTicketsResult> {
    const { data } = await apiClient.get('/support/tickets', { params });
    return {
      data: data.data ?? [],
      current_page: data.current_page ?? 1,
      last_page: data.last_page ?? 1,
      per_page: data.per_page ?? 15,
      total: data.total ?? data.data?.length ?? 0,
      statistics: data.statistics,
    };
  },

  async get(id: number): Promise<SupportTicket> {
    const { data } = await apiClient.get<{ data: SupportTicket }>(`/support/tickets/${id}`);
    return data.data;
  },

  async updateStatus(id: number, status: SupportTicket['status']): Promise<SupportTicket> {
    const { data } = await apiClient.patch<{ data: SupportTicket }>(`/support/tickets/${id}/status`, { status });
    return data.data;
  },

  async updatePriority(id: number, priority: SupportTicket['priority']): Promise<SupportTicket> {
    const { data } = await apiClient.patch<{ data: SupportTicket }>(`/support/tickets/${id}/priority`, { priority });
    return data.data;
  },

  async reply(id: number, message: string): Promise<SupportTicket> {
    const { data } = await apiClient.post<{ data: SupportTicket }>(`/support/tickets/${id}/reply`, { message });
    return data.data;
  },
};
