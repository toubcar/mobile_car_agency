import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import {
  registerPushTokenWithBackend,
  unregisterPushTokenFromBackend,
} from '@/services/pushNotifications.service';
import { resolvePushNotificationRoute } from '@/utils/notificationNavigation';

export function usePushNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthReady = useAuthStore((s) => s.isAuthReady);
  const role = useAuthStore((s) => s.role);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated) {
      registeredRef.current = false;
      void unregisterPushTokenFromBackend();
      return;
    }

    const syncToken = async () => {
      try {
        await registerPushTokenWithBackend();
        registeredRef.current = true;
      } catch (err) {
        console.warn('[push] enregistrement token échoué', err);
      }
    };

    void syncToken();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && isAuthenticated) {
        void syncToken();
      }
    };

    const appStateSub = AppState.addEventListener('change', onAppStateChange);
    return () => appStateSub.remove();
  }, [isAuthReady, isAuthenticated]);

  useEffect(() => {
    const onResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const route = resolvePushNotificationRoute(data, role ?? 'client');
      if (route) {
        router.push(route as never);
      }
    });

    return () => onResponse.remove();
  }, [router, role]);
}
