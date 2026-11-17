import axios from 'axios';

import { t } from '@/i18n';

export function isSessionExpiredError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/** Message court pour bannières « API indisponible ». */
export function describeApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : t('Erreur inconnue');
  }
  if (err.code === 'ECONNABORTED') {
    return t('Délai dépassé — le serveur met trop de temps à répondre.');
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return t('Serveur inaccessible. Vérifiez votre connexion internet.');
  }
  const st = err.response?.status;
  if (st === 401) return t('Session expirée — reconnectez-vous.');
  if (st === 404) return t('Service introuvable. Réessayez plus tard.');
  if (st != null && st >= 500) return t('Erreur du serveur (:st). Réessayez plus tard.', { st });
  const msg = (err.response?.data as { message?: string } | undefined)?.message;
  return msg || err.message;
}
