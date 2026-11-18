import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { goToHome } from '@/utils/authNavigation';
import { resetStartupNavigation } from '@/utils/startupNavigation';

/** Déconnexion fiable : session effacée puis accueil catalogue (admin, agence, client). */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useCallback(async () => {
    resetStartupNavigation();
    await logout();
    queryClient.clear();
    goToHome(router);
  }, [logout, queryClient, router]);
}
