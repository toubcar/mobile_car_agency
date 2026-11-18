import apiClient from './api';

export interface MaintenanceRecord {
  id: number;
  car_id: number;
  agency_id: number;
  title: string;
  type: 'routine' | 'repair' | 'inspection' | 'emergency' | 'other';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type_label?: string;
  status_label?: string;
  scheduled_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  cost?: number;
  description?: string | null;
  garage_name?: string | null;
  garage_contact?: string | null;
  notes?: string | null;
  mileage_at_service?: number | null;
  car?: { id: number; name: string; brand: string; model: string; status: string } | null;
}

/** The maintenance form, same fields and rules as the website */
export interface MaintenancePayload {
  car_id: number;
  title: string;
  type: MaintenanceRecord['type'];
  status: MaintenanceRecord['status'];
  scheduled_date: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
  cost?: number;
  garage_name?: string;
  garage_contact?: string;
  notes?: string;
  mileage_at_service?: number;
}

export interface MaintenancePage {
  data: MaintenanceRecord[];
  statistics: { in_progress: number; scheduled: number; completed: number; total_cost: number };
  current_page: number;
  last_page: number;
  total: number;
}

export const maintenanceService = {
  /** The agency's maintenance, latest planned first (its days are taken off the car's calendar) */
  async list(params?: { status?: MaintenanceRecord['status']; car_id?: number; page?: number; per_page?: number }): Promise<MaintenancePage> {
    const { data } = await apiClient.get<MaintenancePage>('/fleet/maintenances', { params });
    return data;
  },

  async get(id: number): Promise<MaintenanceRecord> {
    const { data } = await apiClient.get<{ data: MaintenanceRecord }>(`/fleet/maintenances/${id}`);
    return data.data;
  },

  async update(id: number, payload: MaintenancePayload): Promise<MaintenanceRecord> {
    const { data } = await apiClient.put<{ data: MaintenanceRecord }>(`/fleet/maintenances/${id}`, payload);
    return data.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/fleet/maintenances/${id}`);
  },

  async create(payload: MaintenancePayload): Promise<MaintenanceRecord> {
    const { data } = await apiClient.post<{ data: MaintenanceRecord }>('/fleet/maintenances', payload);
    return data.data;
  },

  async updateStatus(id: number, status: MaintenanceRecord['status']): Promise<MaintenanceRecord> {
    const { data } = await apiClient.patch<{ data: MaintenanceRecord }>(`/fleet/maintenances/${id}/status`, { status });
    return data.data;
  },
};
