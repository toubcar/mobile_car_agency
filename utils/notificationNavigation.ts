import type { BackofficeNotification } from '@/services/notifications.service';

export type NotificationRole = 'admin' | 'agence' | 'client';

/** Route Expo depuis une notification push (payload `data`). */
export function resolvePushNotificationRoute(
  data: Record<string, unknown>,
  role: NotificationRole = 'client',
): string | null {
  const explicitRoute = typeof data.route === 'string' ? data.route : null;
  if (explicitRoute) return explicitRoute;

  const rentalId = data.rental_id ?? data.related_id;
  const type = String(data.type ?? '').toLowerCase();

  if (type.includes('message') && rentalId != null) {
    return `/messages/${rentalId}`;
  }

  if ((type.includes('booking') || type.includes('reservation')) && rentalId != null) {
    if (role === 'admin') return `/booking/${rentalId}`;
    if (role === 'agence') return `/booking/${rentalId}`;
    return `/booking/${rentalId}`;
  }

  return null;
}

/** Convertit une notification API en route Expo (admin / agence). */
export function resolveNotificationRoute(
  n: BackofficeNotification,
  role: NotificationRole = 'admin',
): string | null {
  const id = n.related_id;
  const category = n.category ?? '';
  const type = (n.type ?? '').toLowerCase();
  const url = (n.action_url ?? '').toLowerCase();

  if (role === 'admin') {
    if (category === 'reservation' || type.includes('reservation') || url.includes('booking') || url.includes('rental')) {
      if (id) return `/booking/${id}`;
      return '/(admin)/(dashboard)/bookings';
    }
    if (category === 'support' || type.includes('support') || url.includes('support') || url.includes('ticket')) {
      if (id) return `/(admin)/ticket/${id}`;
      return '/(admin)/support';
    }
    if (category === 'agency' || type.includes('agency') || url.includes('agenc')) {
      return '/(admin)/agencies';
    }
    if (
      category === 'payment' ||
      type.includes('payment') ||
      type.includes('payout') ||
      url.includes('finance') ||
      url.includes('payment') ||
      url.includes('transaction')
    ) {
      return '/(admin)/finance';
    }
    if (url.includes('review') || url.includes('customer') || url.includes('client')) {
      if (id) return `/(admin)/customer/${id}`;
      return '/(admin)/customers';
    }
    if (url.includes('fleet') || url.includes('/cars') || url.includes('car')) {
      if (id) return `/car/${id}`;
      return '/(admin)/(dashboard)/cars';
    }
    if (url.includes('message')) {
      return '/(admin)/messages';
    }
    if (url.includes('user')) {
      return '/(admin)/(dashboard)/users';
    }
  }

  // A customer's notifications: the booking, the conversation or the support ticket they are about
  if (role === 'client') {
    if (url.includes('message') || type.includes('message')) {
      if (id) return `/messages/${id}`;
      return '/(tabs)/messages';
    }
    if (category === 'support' || type.includes('support') || url.includes('support')) {
      return id ? `/support/${id}` : '/support';
    }
    if (category === 'booking' || type.includes('booking') || type.includes('reservation') || type.includes('rental') || url.includes('rental') || url.includes('booking')) {
      return id ? `/booking/${id}` : '/(tabs)/bookings';
    }
  }

  if (role === 'agence') {
    if (category === 'support' || type.includes('support') || url.includes('support') || url.includes('ticket')) {
      return id ? `/support/${id}` : '/support';
    }
    if (category === 'reservation' || url.includes('booking') || url.includes('rental')) {
      if (id) return `/booking/${id}`;
      return '/(agence)/bookings';
    }
    if (category === 'payment' || url.includes('finance')) {
      return '/(agence)/finance';
    }
    if (url.includes('fleet') || url.includes('car')) {
      if (id) return `/car/${id}`;
      return '/(agence)/cars';
    }
    if (url.includes('message')) {
      return '/(agence)/messages';
    }
  }

  return null;
}

/** Route pour les alertes de secours (tableau de bord). */
export function resolveFallbackAlertRoute(alert: string, role: NotificationRole = 'admin'): string {
  const t = alert.toLowerCase();
  if (role === 'admin') {
    if (t.includes('réservation') || t.includes('reservation') || t.includes('attente')) {
      return '/(admin)/(dashboard)/bookings';
    }
    if (t.includes('support') || t.includes('ticket')) return '/(admin)/support';
    if (t.includes('paiement') || t.includes('payment') || t.includes('finance')) {
      return '/(admin)/finance';
    }
    if (t.includes('agenc')) return '/(admin)/agencies';
  }
  return '/(admin)/(dashboard)/bookings';
}
