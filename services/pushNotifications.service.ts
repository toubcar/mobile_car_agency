import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PermissionStatus } from 'expo-modules-core';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import apiClient from './api';

/** false = pas de push (test local / Expo Go). Remettre à true pour un dev build. */
export const PUSH_ENABLED = false;

let cachedToken: string | null = null;

if (PUSH_ENABLED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function resolveProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return fromEnv || fromExtra || fromEas || null;
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Général',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('bookings', {
    name: 'Réservations',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!PUSH_ENABLED) return true;
  if (!Device.isDevice) return false;

  const current = (await Notifications.getPermissionsAsync()) as { status: PermissionStatus };
  if (current.status === PermissionStatus.GRANTED) {
    return true;
  }

  const requested = (await Notifications.requestPermissionsAsync()) as { status: PermissionStatus };
  return requested.status === PermissionStatus.GRANTED;
}

export async function registerPushTokenWithBackend(): Promise<string | null> {
  if (!PUSH_ENABLED) return null;
  if (!Device.isDevice) {
    return null;
  }

  const granted = await requestPushPermissions();
  if (!granted) {
    return null;
  }

  await ensureAndroidChannels();

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn('[push] EAS projectId manquant — définissez EXPO_PUBLIC_EAS_PROJECT_ID ou extra.eas.projectId');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;
  if (!token || token === cachedToken) {
    cachedToken = token ?? cachedToken;
    return token ?? null;
  }

  await apiClient.post('/device-tokens', {
    token,
    platform: Platform.OS,
    device_name: Device.deviceName ?? undefined,
  });

  cachedToken = token;
  return token;
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  if (!PUSH_ENABLED || !cachedToken) return;

  try {
    await apiClient.delete('/device-tokens', { data: { token: cachedToken } });
  } catch {
    /* token déjà retiré côté serveur */
  } finally {
    cachedToken = null;
  }
}

export function getCachedPushToken(): string | null {
  return cachedToken;
}
