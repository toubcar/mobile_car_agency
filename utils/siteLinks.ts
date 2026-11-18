/**
 * Where a link written by the admin (banner, page) leads in the app: a screen of the app when the website has the same
 * page, the browser otherwise.
 */
export type LinkTarget = { kind: 'app'; route: string } | { kind: 'web'; url: string } | { kind: 'none' };

export function linkTarget(link: string | null | undefined, backendUrl: string): LinkTarget {
  const raw = (link ?? '').trim();
  if (!raw) return { kind: 'none' };

  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    const base = backendUrl.replace(/\/$/, '');
    if (!raw.startsWith(base) && !/^https?:\/\/(www\.)?toubcar\.com/i.test(raw)) return { kind: 'web', url: raw };
    path = raw.replace(/^https?:\/\/[^/]+/i, '') || '/';
  }

  const [pathname, query = ''] = path.split('?');
  const clean = pathname.replace(/\/+$/, '') || '/';

  const page = clean.match(/^\/pages\/([A-Za-z0-9_-]+)$/);
  if (page) return { kind: 'app', route: `/pages/${page[1]}` };
  if (clean === '/faq' || clean === '/aide' || clean === '/help') return { kind: 'app', route: '/help' };
  if (clean === '/cars/search' || clean === '/cars' || clean === '/search') {
    return { kind: 'app', route: query ? `/(tabs)/search?${query}` : '/(tabs)/search' };
  }
  const car = clean.match(/^\/agencies\/\d+\/cars\/(\d+)$/) ?? clean.match(/^\/cars\/(\d+)$/);
  if (car) return { kind: 'app', route: `/car/${car[1]}` };
  if (clean === '/') return { kind: 'app', route: '/(tabs)' };

  return { kind: 'web', url: `${backendUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}` };
}
