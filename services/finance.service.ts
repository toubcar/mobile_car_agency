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

/** One ToubCar commission (one per confirmed booking), as the agency and the admin read it */
export interface CommissionRow {
  id: number;
  rental_id: number | null;
  date?: string;
  created_at?: string;
  customer?: string | null;
  car?: string | null;
  /** What the customer paid (commission included) */
  total_price: number;
  commission_rate: number;
  commission_amount: number;
  /** The agency's share: its own price */
  agency_amount: number;
  payment_mode?: 'online' | 'on_site' | null;
  payment_mode_label?: string;
  status: 'completed' | 'cancelled';
  status_label?: string;
}

export interface AdminCommissionOverview {
  statistics: Record<string, number>;
  summary: { total_transactions: number; total_commission: number; average_commission: number };
  period?: { start_date: string; end_date: string };
  agencies: Array<{
    id: number;
    name: string;
    city?: string | null;
    commission_rate: number;
    period_commission: number;
    period_bookings: number;
  }>;
  transactions: Array<CommissionRow & { agency_id?: number; agency_name?: string; original_amount: number }>;
}

export interface AgencyFinanceTransaction {
  id: number;
  type: string;
  type_label: string;
  description: string;
  amount: number;
  /** Money in (rental share, refund of a commission) or out (payout, commission) of the agency's balance */
  is_income: boolean;
  status: string;
  status_label: string;
  rental_id?: number | null;
  created_at?: string;
  bank_name?: string | null;
  transfer_reference?: string | null;
  rejection_reason?: string | null;
}

export interface AgencyFinanceOverview {
  overview: {
    total_earnings: number;
    pending_earnings: number;
    upcoming_earnings: number;
    current_balance: number;
    monthly_revenue: number;
    previous_month_revenue: number;
    revenue_growth: number;
    commission_rate: number;
  };
  transactions: AgencyFinanceTransaction[];
  payout_requests: AgencyFinanceTransaction[];
}

export interface AgencyCommissionsPage {
  data: CommissionRow[];
  statistics: { month_commission: number; month_share: number; month_bookings: number; rate: number };
  current_page: number;
  last_page: number;
  total: number;
}

export const financeService = {
  // ── Agency (same figures as the website's Finance pages) ──────────────────
  async agencyOverview(): Promise<AgencyFinanceOverview> {
    const { data } = await apiClient.get<{ data: AgencyFinanceOverview }>('/agence/finance');
    return data.data;
  },

  async agencyCommissions(params?: { status?: 'completed' | 'cancelled'; period?: 'today' | 'week' | 'month' | 'year'; search?: string; page?: number }): Promise<AgencyCommissionsPage> {
    const { data } = await apiClient.get<AgencyCommissionsPage>('/agence/finance/commissions', { params });
    return data;
  },

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

  async adminCommissions(params?: { start_date?: string; end_date?: string; agency_id?: number }): Promise<AdminCommissionOverview> {
    const { data } = await apiClient.get<AdminCommissionOverview>('/admin/finance/commissions', { params });
    return data;
  },

  async validateCommissions(rentalId?: number): Promise<{ invalid_count: number; validations: unknown[] }> {
    const { data } = await apiClient.post<{ invalid_count: number; validations: unknown[] }>('/admin/finance/commissions/validate', rentalId ? { rental_id: rentalId } : {});
    return data;
  },
};
