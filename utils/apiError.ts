import axios from 'axios';

export function isSessionExpiredError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/** Message court pour bannières « API indisponible ». */
export function describeApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : 'Erreur inconnue';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Délai dépassé — le serveur met trop de temps à répondre.';
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return 'Serveur inaccessible (même Wi‑Fi, pare-feu, ou backend arrêté).';
  }
  const st = err.response?.status;
  if (st === 401) return 'Session expirée — reconnectez-vous.';
  if (st === 404) return 'Route introuvable — vérifiez l’URL de l’API.';
  if (st != null && st >= 500) return `Erreur serveur (${st}).`;
  const msg = (err.response?.data as { message?: string } | undefined)?.message;
  return msg || err.message;
}
