import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { PUBLIC_HOME_ROUTE } from '@/utils/authNavigation';
import type { User } from '@/types';

/**
 * Protège admin / agence : renvoie vers le catalogue si l'utilisateur n'a pas le bon rôle.
 * Ne redirige jamais automatiquement vers un autre espace pro (évite admin au démarrage).
 */
export function useRequireRole(required: Extract<User['role'], 'admin' | 'agence'>) {
  const router = useRouter();
  const { role, isAuthenticated, isAuthReady } = useAuthStore();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!isAuthReady || didRedirect.current) return;
    if (isAuthenticated && role === required) return;

    didRedirect.current = true;
    router.replace(PUBLIC_HOME_ROUTE);
  }, [isAuthenticated, isAuthReady, role, required, router]);
}
