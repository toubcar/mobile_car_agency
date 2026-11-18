import apiClient from './api';

export interface CancellationStats {
  cancellation_count: number;
  max_cancellations: number;
  remaining_cancellations: number;
  is_suspended: boolean;
  last_cancellation?: string;
  warning_message?: string;
}

export interface SpecialOfferRecord {
  id: number;
  agency_id: number;
  name: string;
  code: string;
  type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  max_usage: number;
  usage_count: number;
  vehicle_ids: number[];
  is_active: boolean;
  offer_type?: 'regular' | 'flash' | 'promo_code';
}

export interface SpecialOfferPayload {
  name: string;
  code: string;
  type: SpecialOfferRecord['type'];
  discount_value: number;
  start_date: string;
  end_date: string;
  max_usage: number;
  vehicle_ids: number[];
  is_flash?: boolean;
  is_promo_code?: boolean;
}

export const marketingService = {
  async getCancellationStats(): Promise<CancellationStats> {
    const { data } = await apiClient.get<{ data: CancellationStats }>('/agence/cancellations/stats');
    return data.data;
  },

  async cancelRental(rentalId: number, payload: { cancellation_reason: string; notes?: string }): Promise<{
    success: boolean;
    message: string;
    warning?: string;
    suspended?: boolean;
  }> {
    const { data } = await apiClient.post<{ data: { success: boolean; message: string; warning?: string; suspended?: boolean } }>(
      `/agence/cancellations/rentals/${rentalId}`,
      payload
    );
    return data.data;
  },

  async resetCancellationCount(agencyId: number): Promise<void> {
    await apiClient.patch(`/admin/agencies/${agencyId}/cancellations/reset`);
  },

  /** The agency's offers (website: Tarification > Offres) and its cars to choose from */
  async listOffers(): Promise<{ data: Array<SpecialOfferRecord & { is_running?: boolean }>; cars: Array<{ id: number; name: string; registration_number?: string | null }> }> {
    const { data } = await apiClient.get<{ data: Array<SpecialOfferRecord & { is_running?: boolean }>; cars: Array<{ id: number; name: string; registration_number?: string | null }> }>('/agence/marketing/offers');
    return { data: data.data ?? [], cars: data.cars ?? [] };
  },

  async createOffer(payload: SpecialOfferPayload): Promise<SpecialOfferRecord> {
    const { data } = await apiClient.post<{ data: SpecialOfferRecord }>('/agence/marketing/offers', payload);
    return data.data;
  },

  async updateOffer(id: number, payload: SpecialOfferPayload): Promise<SpecialOfferRecord> {
    const { data } = await apiClient.put<{ data: SpecialOfferRecord }>(`/agence/marketing/offers/${id}`, payload);
    return data.data;
  },

  async toggleOffer(id: number): Promise<SpecialOfferRecord> {
    const { data } = await apiClient.patch<{ data: SpecialOfferRecord }>(`/agence/marketing/offers/${id}/toggle`);
    return data.data;
  },

  async deleteOffer(id: number): Promise<void> {
    await apiClient.delete(`/agence/marketing/offers/${id}`);
  },
};
