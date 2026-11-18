import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Base API — machine qui exécute Laravel (CarAgency), pas ToubcarMobile.
//
// • Téléphone physique + Expo Go : IP Metro auto (debuggerHost) si .env = 127.0.0.1
// • Émulateur Android : 10.0.2.2 (auto si .env = 127.0.0.1)
// • iOS simulateur / PC : 127.0.0.1
//
// Laravel : cd CarAgency && php artisan serve --host=0.0.0.0 --port=8000

/** Extrait l’hôte IPv4 depuis une URL Expo (exp://192.168.x.x:8081, debuggerHost, hostUri…). */
function hostFromExpoUri(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const stripped = raw.replace(/^exp:\/\//, '').replace(/^https?:\/\//, '');
  const host = stripped.split(':')[0]?.split('/')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

/** IP du PC hôte Expo — même réseau que le téléphone (évite une IP .env périmée). */
function lanHostFromExpo(): string | null {
  const extra = (Constants as {
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string }; expoClient?: { hostUri?: string } } };
  }).manifest2?.extra;

  const candidates = [
    Constants.expoGoConfig?.debuggerHost,
    Constants.expoConfig?.hostUri,
    extra?.expoGo?.debuggerHost,
    extra?.expoClient?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
  ];

  for (const raw of candidates) {
    const host = hostFromExpoUri(raw);
    if (host) return host;
  }
  return null;
}

function isLoopbackUrl(url: string): boolean {
  return url.includes('127.0.0.1') || url.includes('localhost');
}

function isProductionHostUrl(url: string): boolean {
  return /toubcar\.com/i.test(url) || /^https:\/\//i.test(url);
}

function resolveBackendUrl(): string {
  let fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || '';
  const forceProdInDev = process.env.EXPO_PUBLIC_USE_PROD === '1';
  const lan = lanHostFromExpo();

  // En Expo Go / __DEV__, ignorer toubcar.com (routes dashboard mobile absentes → 404).
  // Remettre EXPO_PUBLIC_USE_PROD=1 seulement pour tester volontairement la prod.
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    !forceProdInDev &&
    fromEnv &&
    isProductionHostUrl(fromEnv)
  ) {
    fromEnv = 'http://127.0.0.1:8000';
  }

  const port = fromEnv.match(/:(\d+)/)?.[1] ?? '8000';

  // URL distante non-loopback (prod volontaire, ou staging).
  if (fromEnv.length > 0 && !isLoopbackUrl(fromEnv)) {
    return fromEnv.replace(/\/$/, '');
  }

  // Dev + Expo Go + loopback : IP LAN auto (127.0.0.1 → IP du PC / téléphone).
  if (typeof __DEV__ !== 'undefined' && __DEV__ && lan) {
    return `http://${lan}:${port}`;
  }

  if (fromEnv.length > 0) {
    if (Platform.OS === 'android' && isLoopbackUrl(fromEnv)) {
      return fromEnv.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2').replace(/\/$/, '');
    }
    if (isLoopbackUrl(fromEnv) && lan) {
      return `http://${lan}:${port}`;
    }
    return fromEnv.replace(/\/$/, '');
  }

  if (lan) return `http://${lan}:${port}`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

const backend = resolveBackendUrl();
export const BACKEND_URL = backend;
export const API_BASE_URL = `${backend}/api`;
export const APP_NAME = 'ToubCar';

export const COLORS = {
  primary: '#1D3557',
  primaryDark: '#16283F',
  secondary: '#457B9D',
  accent: '#AED6F1',
  background: '#F0F8FF',
  white: '#FFFFFF',
  black: '#212529',
  gray: '#6C757D',
  lightGray: '#D6EAF8',
  border: '#DEE2E6',
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
};