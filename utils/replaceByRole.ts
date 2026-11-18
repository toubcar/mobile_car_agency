import type { Router } from 'expo-router';
import type { User } from '@/types';
import { resolvePostSplashRoute } from '@/utils/authNavigation';
import { allowProNavigation } from '@/utils/startupNavigation';

/** Redirection selon le rôle après connexion explicite (login, OAuth…). */
export function replaceRootByRole(
  router: Pick<Router, 'replace' | 'dismissAll' | 'canDismiss'>,
  role: User['role'] | null | undefined,
): void {
  allowProNavigation();
  resolvePostSplashRoute(router, true, role);
}
