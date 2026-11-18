import apiClient from './api';
import { toAmount } from '@/utils/money';

export interface AgencyReportOverview {
  stats: {
    total_revenue: number;
    total_rentals: number;
    active_rentals: number;
    total_cars: number;
  };
  performance: {
    total_revenue: number;
    total_rentals: number;
    monthly_data: Array<{ month: string; revenue: number; rentals: number; average_revenue: number }>;
  };
  customers: Record<string, number | string | null>;
  fleet: {
    total_vehicles: number;
    available_vehicles: number;
    maintenance_vehicles: number;
  };
}

function normalizeOverview(raw: AgencyReportOverview): AgencyReportOverview {
  return {
    ...raw,
    stats: {
      total_revenue: toAmount(raw.stats?.total_revenue),
      total_rentals: Number(raw.stats?.total_rentals) || 0,
      active_rentals: Number(raw.stats?.active_rentals) || 0,
      total_cars: Number(raw.stats?.total_cars) || 0,
    },
    performance: {
      total_revenue: toAmount(raw.performance?.total_revenue),
      total_rentals: Number(raw.performance?.total_rentals) || 0,
      monthly_data: (raw.performance?.monthly_data ?? []).map((m) => ({
        month: m.month,
        revenue: toAmount(m.revenue),
        rentals: Number(m.rentals) || 0,
        average_revenue: toAmount(m.average_revenue),
      })),
    },
    fleet: raw.fleet,
    customers: raw.customers,
  };
}

export const reportsService = {
  async getAgencyOverview(): Promise<AgencyReportOverview> {
    const { data } = await apiClient.get<AgencyReportOverview>('/agence/reports/overview');
    return normalizeOverview(data);
  },
};
