import apiClient from './api';

export interface FinanceTransaction {
  id: number;
  agency_id?: number;
  type: string;
  amount: number;
  status: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  processed_at?: string;
}

export interface AdminPaymentRequest extends FinanceTransaction {
  agency_name?: string;
  bank_name?: string;
  rib_number?: string;
  account_holder?: string;
  notes?: string;
  admin_notes?: string;
  transfer_reference?: string;
  rejection_reason?: string;
}

export interface AdminCommissionOverview {
  statistics: Record<string, number>;
  summary: Record<string, number>;
  transactions: Array<{
    id: number;
    agency_name?: string;
    car?: string;
    original_amount: number;
    commission_amount: number;
    commission_rate: number;
    created_at?: string;
  }>;
}

export const financeService = {
  async requestPayment(payload: {
    amount: number;
    bank_name: string;
    rib_number: string;
    account_holder: string;
    notes?: string;
  }): Promise<FinanceTransaction> {
    const { data } = await apiClient.post<{ data: FinanceTransaction }>('/agence/finance/request-payment', payload);
    return data.data;
  },

  async processPayout(agencyId: number, amount: number, notes?: string): Promise<FinanceTransaction> {
    const { data } = await apiClient.post<{ data: FinanceTransaction }>(`/admin/finance/agencies/${agencyId}/payout`, {
      amount,
      notes,
    });
    return data.data;
  },

  async adminPaymentRequests(): Promise<{ data: AdminPaymentRequest[]; statistics: Record<string, number> }> {
    const { data } = await apiClient.get<{ data: AdminPaymentRequest[]; statistics: Record<string, number> }>('/admin/finance/payment-requests');
    return data;
  },

  async approvePaymentRequest(id: number, payload?: { reference?: string; notes?: string }): Promise<AdminPaymentRequest> {
    const { data } = await apiClient.patch<{ data: AdminPaymentRequest }>(`/admin/finance/payment-requests/${id}/approve`, payload ?? {});
    return data.data;
  },

  async rejectPaymentRequest(id: number, reason: string): Promise<AdminPaymentRequest> {
    const { data } = await apiClient.patch<{ data: AdminPaymentRequest }>(`/admin/finance/payment-requests/${id}/reject`, { reason });
    return data.data;
  },

  async adminCommissions(): Promise<AdminCommissionOverview> {
    const { data } = await apiClient.get<AdminCommissionOverview>('/admin/finance/commissions');
    return data;
  },

  async validateCommissions(rentalId?: number): Promise<{ invalid_count: number; validations: unknown[] }> {
    const { data } = await apiClient.post<{ invalid_count: number; validations: unknown[] }>('/admin/finance/commissions/validate', rentalId ? { rental_id: rentalId } : {});
    return data;
  },
};
