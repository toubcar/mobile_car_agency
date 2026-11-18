import { router as rootRouter, type Router } from 'expo-router';
import type { User } from '@/types';

/** Catalogue public — `app/(tabs)/index.tsx` (le href Expo Router est `/(tabs)`, pas `/(tabs)/index`). */
export const PUBLIC_HOME_ROUTE = '/(tabs)';

/** Landing ToubCar (logo, client / pro) — pas l'écran login. */
export const AUTH_WELCOME_ROUTE = '/(auth)/welcome';

type RouterHome = Pick<Router, 'replace' | 'dismissAll' | 'canDismiss'>;

/** Quitte admin/agence et ouvre le catalogue public. */
export function goToHome(router?: RouterHome): void {
  if (router?.canDismiss?.()) {
    router.dismissAll();
  }
  rootRouter.replace(PUBLIC_HOME_ROUTE);
}

/** Après connexion : espace métier selon le rôle ; client → accueil. */
export function resolvePostSplashRoute(
  router: RouterHome,
  isAuthenticated: boolean,
  role: User['role'] | null | undefined,
): void {
  if (!isAuthenticated) {
    goToHome(router);
    return;
  }
  if (role === 'admin') {
    router.replace('/(admin)/(dashboard)');
    return;
  }
  if (role === 'agence') {
    router.replace('/(agence)');
    return;
  }
  goToHome(router);
}
