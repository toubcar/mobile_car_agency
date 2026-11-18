import type { Booking } from '@/types';

/** Statuts API Laravel (`Rental`) pour lesquels l’envoi de messages est autorisé */
export function isRentalMessagingOpen(rentalStatus: string): boolean {
  return rentalStatus === 'pending' || rentalStatus === 'active';
}

/** Statut réservation côté UI mobile → statut location API messagerie */
export function bookingStatusToRentalApi(status: Booking['status']): string {
  if (status === 'confirmed') return 'active';
  if (status === 'cancelled') return 'rejected';
  return status;
}

export function canMessageBooking(booking: Pick<Booking, 'status'>): boolean {
  return booking.status === 'confirmed';
}
