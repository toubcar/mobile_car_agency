import apiClient from './api';
import type { Booking } from '@/types';

export interface DashboardStats {
  total_cars: number;
  available_cars: number;
  total_bookings: number;
  active_bookings: number;
  total_users?: number;
  new_users_this_month?: number;
  total_revenue: number;
  revenue_this_month: number;
}

function unwrapStats(body: unknown): DashboardStats {
  if (body == null || typeof body !== 'object') {
    return {
      total_cars: 0, available_cars: 0, total_bookings: 0, active_bookings: 0,
      total_users: 0, new_users_this_month: 0, total_revenue: 0, revenue_this_month: 0,
    };
  }
  const o = body as Record<string, unknown>;
  const payload = (o.data ?? o) as Record<string, unknown>;
  return {
    total_cars: Number(payload.total_cars) || 0,
    available_cars: Number(payload.available_cars) || 0,
    total_bookings: Number(payload.total_bookings) || 0,
    active_bookings: Number(payload.active_bookings) || 0,
    total_users: Number(payload.total_users) || 0,
    new_users_this_month: Number(payload.new_users_this_month) || 0,
    total_revenue: Number(payload.total_revenue) || 0,
    revenue_this_month: Number(payload.revenue_this_month) || 0,
  };
}

function unwrapBookings(body: unknown): Booking[] {
  if (body == null) return [];
  if (Array.isArray(body)) return body as Booking[];
  if (typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  const inner = o.data;
  if (Array.isArray(inner)) return inner as Booking[];
  if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
    return (inner as { data: Booking[] }).data;
  }
  return [];
}

export const dashboardService = {
  async getAdminStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get('/admin/dashboard/stats');
    return unwrapStats(data);
  },

  async getAdminRecentBookings(): Promise<Booking[]> {
    const { data } = await apiClient.get('/admin/dashboard/recent-bookings');
    return unwrapBookings(data);
  },

  async getAgenceStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get('/agence/dashboard/stats');
    return unwrapStats(data);
  },

  async getAgenceRecentBookings(): Promise<Booking[]> {
    const { data } = await apiClient.get('/agence/dashboard/recent-bookings');
    return unwrapBookings(data);
  },
};
