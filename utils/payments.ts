import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { bookingsService } from '@/services/bookings.service';

export type PaymentOutcome = 'paid' | 'cancelled' | 'failed';

/** Où PayPal renvoie le client : l'app elle-même (toubcar://payment-return, ou Expo Go pendant le développement). */
export function paymentReturnUrl(): string {
  return Linking.createURL('payment-return');
}

/** Le résultat écrit dans l'adresse de retour par le serveur : …?status=paid|cancelled|failed&booking=12 */
export function outcomeFromUrl(url: string | null | undefined): PaymentOutcome | null {
  if (!url) return null;
  const query = url.split('#')[0].split('?')[1] ?? '';
  for (const part of query.split('&')) {
    const [key, value = ''] = part.split('=');
    if (decodeURIComponent(key) === 'status') {
      const status = decodeURIComponent(value);
      return status === 'paid' || status === 'cancelled' || status === 'failed' ? status : null;
    }
  }
  return null;
}

/**
 * Paie une réservation comme sur le site : la page PayPal s'ouvre dans le navigateur intégré, le serveur encaisse
 * quand PayPal renvoie le client, puis le navigateur revient dans l'app. Si le navigateur est fermé avant ce retour,
 * l'app demande au serveur de vérifier le paiement auprès de PayPal.
 */
export async function payBooking(id: number): Promise<PaymentOutcome> {
  const returnUrl = paymentReturnUrl();
  const { approve_url } = await bookingsService.startPayment(id, returnUrl);
  const result = await WebBrowser.openAuthSessionAsync(approve_url, returnUrl);
  const outcome = result.type === 'success' ? outcomeFromUrl(result.url) : null;

  if (outcome === 'paid' || outcome === 'cancelled') return outcome;

  try {
    const captured = await bookingsService.capturePayment(id);
    if (captured.status === 'paid') return 'paid';
  } catch {
    /* pas approuvé par le client : rien n'a été débité */
  }

  return outcome === 'failed' ? 'failed' : 'cancelled';
}

/** Minutes restantes pour payer une réservation (0 quand le délai est passé). */
export function minutesLeftToPay(payBefore: string | null | undefined, now: number = Date.now()): number {
  if (!payBefore) return 0;
  const limit = new Date(payBefore).getTime();
  if (Number.isNaN(limit)) return 0;
  return Math.max(0, Math.ceil((limit - now) / 60_000));
}
