import { BACKEND_URL } from '@/constants/api';

/** Remplace localhost dans les URLs API par l’hôte réel utilisé par l’app (Expo / téléphone). */
function rewriteBackendHost(url: string): string {
  try {
    const target = new URL(BACKEND_URL);
    const parsed = new URL(url);
    const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (!isLoopback) return url;
    parsed.protocol = target.protocol;
    parsed.host = target.host;
    return parsed.toString();
  } catch {
    return url;
  }
}

function resolveCarImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return rewriteBackendHost(url);
  }
  if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
  return `${BACKEND_URL}/storage/${url}`;
}

/** Normalise les URLs d'images renvoyées par l'API (string, tableau, objets { url }). */
export function normalizeCarImages(images: unknown, fallback?: unknown): string[] {
  const collected: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      const resolved = resolveCarImageUrl(value);
      if (resolved) collected.push(resolved);
      return;
    }
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      const candidate = o.url ?? o.path ?? o.image ?? o.src ?? o.full_url;
      if (typeof candidate === 'string') push(candidate);
    }
  };

  if (Array.isArray(images)) {
    images.forEach(push);
  } else {
    push(images);
  }

  if (!collected.length && fallback != null) {
    if (Array.isArray(fallback)) fallback.forEach(push);
    else push(fallback);
  }

  return [...new Set(collected)];
}
