import apiClient from './api';

export interface BackofficeSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  value: number;
  attention: number;
  metric: string;
  modules?: string[];
  webRoute?: string;
  controller?: string;
}

export interface BackofficeProfile {
  name: string;
  email: string;
  role: 'admin' | 'agence';
  scope?: string;
  status?: string;
  city?: string | null;
}

export interface BackofficeOverview {
  profile: BackofficeProfile;
  sections: BackofficeSection[];
  alerts: string[];
}

export interface BackofficeMetric {
  label: string;
  value: number;
  format?: 'number' | 'money';
}

export interface BackofficeRecord {
  id: number;
  title?: string;
  subtitle?: string;
  badge?: string | boolean | null;
  amount?: number | string;
  created_at?: string;
}

export interface BackofficeModuleDetail {
  section?: BackofficeSection;
  metrics: BackofficeMetric[];
  records: BackofficeRecord[];
  actions: string[];
}

function unwrapOverview(body: unknown): BackofficeOverview {
  const fallback: BackofficeOverview = { profile: { name: '', email: '', role: 'admin' }, sections: [], alerts: [] };
  if (!body || typeof body !== 'object') return fallback;
  const root = body as { data?: unknown };
  const payload = (root.data ?? body) as Partial<BackofficeOverview>;

  return {
    profile: payload.profile ?? fallback.profile,
    sections: Array.isArray(payload.sections) ? payload.sections : [],
    alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
  };
}

function unwrapModule(body: unknown): BackofficeModuleDetail {
  const fallback: BackofficeModuleDetail = { metrics: [], records: [], actions: [] };
  if (!body || typeof body !== 'object') return fallback;
  const root = body as { data?: unknown };
  const payload = (root.data ?? body) as Partial<BackofficeModuleDetail>;
  return {
    section: payload.section,
    metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
    records: Array.isArray(payload.records) ? payload.records : [],
    actions: Array.isArray(payload.actions) ? payload.actions : [],
  };
}

export const backofficeService = {
  async getAdminOverview(): Promise<BackofficeOverview> {
    const { data } = await apiClient.get('/admin/backoffice/overview');
    return unwrapOverview(data);
  },

  async getAgenceOverview(): Promise<BackofficeOverview> {
    const { data } = await apiClient.get('/agence/backoffice/overview');
    return unwrapOverview(data);
  },

  async getAdminModule(module: string): Promise<BackofficeModuleDetail> {
    const { data } = await apiClient.get(`/admin/backoffice/modules/${module}`);
    return unwrapModule(data);
  },

  async getAgenceModule(module: string): Promise<BackofficeModuleDetail> {
    const { data } = await apiClient.get(`/agence/backoffice/modules/${module}`);
    return unwrapModule(data);
  },
};
