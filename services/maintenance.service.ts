import apiClient from './api';

export interface MaintenanceRecord {
  id: number;
  car_id: number;
  agency_id: number;
  title: string;
  type: 'routine' | 'repair' | 'inspection' | 'emergency' | 'other';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  start_date?: string;
  end_date?: string;
  cost?: number;
}

export const maintenanceService = {
  async create(payload: {
    car_id: number;
    title: string;
    type: MaintenanceRecord['type'];
    status: MaintenanceRecord['status'];
    scheduled_date: string;
    description?: string;
    cost?: number;
    garage_name?: string;
    garage_contact?: string;
    notes?: string;
    mileage_at_service?: number;
  }): Promise<MaintenanceRecord> {
    const { data } = await apiClient.post<{ data: MaintenanceRecord }>('/fleet/maintenances', payload);
    return data.data;
  },

  async updateStatus(id: number, status: MaintenanceRecord['status']): Promise<MaintenanceRecord> {
    const { data } = await apiClient.patch<{ data: MaintenanceRecord }>(`/fleet/maintenances/${id}/status`, { status });
    return data.data;
  },
};
