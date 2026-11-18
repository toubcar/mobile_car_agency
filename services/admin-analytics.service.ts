import apiClient from './api';

export interface AdminReportsOverview {
  overview: Record<string, number>;
  data_sources: string[];
  date_ranges: string[];
  performance: Record<string, number>;
}

export interface CompetitorOverview {
  competitors: Array<Record<string, unknown>>;
  toubcar_stats: Record<string, unknown>;
  market_analysis: Record<string, unknown>;
  swot: Record<string, string[]>;
  recommendations: Array<Record<string, string>>;
}

export const adminAnalyticsService = {
  async reportsOverview(): Promise<AdminReportsOverview> {
    const { data } = await apiClient.get<AdminReportsOverview>('/admin/analytics/reports');
    return data;
  },

  async customReport(payload: {
    data_sources: string[];
    date_range: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ data: Record<string, unknown> }> {
    const { data } = await apiClient.post<{ data: Record<string, unknown> }>('/admin/analytics/reports/custom', payload);
    return data;
  },

  async competitors(): Promise<CompetitorOverview> {
    const { data } = await apiClient.get<CompetitorOverview>('/admin/analytics/competitors');
    return data;
  },

  async pricingBenchmark(): Promise<{ data: Array<Record<string, unknown>> }> {
    const { data } = await apiClient.get<{ data: Array<Record<string, unknown>> }>('/admin/analytics/competitors/pricing');
    return data;
  },
};
