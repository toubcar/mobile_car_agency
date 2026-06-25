import { useEffect } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { PUBLIC_HOME_ROUTE } from '@/utils/authNavigation';
import { shouldBlockProSpaceOnStartup } from '@/utils/startupNavigation';

function isProSpace(segments: string[]): boolean {
  return segments.includes('(admin)') || segments.includes('(agence)');
}

/**
 * Si Expo rouvre admin/agence au lancement, renvoie vers le catalogue public.
 */
export function useEnforcePublicStartup(): void {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || !shouldBlockProSpaceOnStartup()) return;
    if (!isProSpace(segments)) return;

    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace(PUBLIC_HOME_ROUTE);
  }, [segments, navigationState?.key, router]);
}
