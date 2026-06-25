import { toAmount } from '@/utils/money';

/**
 * Durée de location en jours — même logique que Laravel :
 * `Carbon::parse($start)->diffInDays($end)` avec dates au format Y-m-d.
 * Le montant `total_price` est toujours celui renvoyé par l'API (price_per_day × jours côté serveur).
 */
export function rentalDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / 86_400_000);
  return days >= 1 ? days : 0;
}

function parseDateOnly(iso: string): Date | null {
  const slice = iso?.slice(0, 10);
  if (!slice || !/^\d{4}-\d{2}-\d{2}$/.test(slice)) return null;
  const d = new Date(`${slice}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Estimation affichée avant création — même formule que `BookingController` Laravel.
 * Le montant définitif est toujours `total_price` renvoyé par POST /bookings.
 */
export function estimateRentalTotal(pricePerDay: unknown, startDate: string, endDate: string): number {
  const days = rentalDays(startDate, endDate);
  if (days < 1) return 0;
  return toAmount(pricePerDay) * days;
}
