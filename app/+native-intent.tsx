import type { NativeIntent } from 'expo-router';

/**
 * Au cold start, remplace admin/agence/login par le splash (`app/index.tsx`).
 * Ne pas effacer les autres routes valides (ex. /(tabs)) — évite « Unmatched Route ».
 */
export const redirectSystemPath: NonNullable<NativeIntent['redirectSystemPath']> = ({
  path,
  initial,
}) => {
  if (!initial || !path) {
    return path;
  }

  try {
    if (/^exp(s)?:\/\//i.test(path) && path.includes('/--/')) {
      let next = path;
      next = next.replace(/\/--\/\(admin\)(\/[^?]*)?/, '/--/');
      next = next.replace(/\/--\/\(agence\)(\/[^?]*)?/, '/--/');
      next = next.replace(/\/--\/\(auth\)\/login[^?]*/, '/--/(tabs)');
      return next;
    }

    const q = path.indexOf('?');
    const pathname = q === -1 ? path : path.slice(0, q);
    const search = q === -1 ? '' : path.slice(q);
    if (
      pathname.startsWith('/(admin)') ||
      pathname.startsWith('/(agence)') ||
      pathname.startsWith('/(auth)/login')
    ) {
      return `/${search}`;
    }

    return path;
  } catch {
    return path;
  }
};
