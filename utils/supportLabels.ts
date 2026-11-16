import type { SupportTicket } from '@/services/support.service';
import { t } from '@/i18n';

export function ticketStatusLabel(status: SupportTicket['status']): string {
  switch (status) {
    case 'open': return t('Ouvert');
    case 'in_progress': return t('En cours');
    case 'resolved': return t('Résolu');
    case 'closed': return t('Fermé');
    default: return status;
  }
}

export function ticketStatusColor(status: SupportTicket['status']): string {
  switch (status) {
    case 'open': return '#2563EB';
    case 'in_progress': return '#D97706';
    case 'resolved': return '#059669';
    default: return '#6B7280';
  }
}
