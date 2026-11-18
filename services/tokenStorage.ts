import * as SecureStore from 'expo-secure-store';

const KEY = 'auth_token';

// A browser (the web build, handy to test the app on a computer) has no secure storage: the page's local storage is used
const isWeb = typeof document !== 'undefined' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/** Le jeton de session : stockage sécurisé du téléphone, ou stockage local du navigateur pour la version web de test. */
export const tokenStorage = {
  async get(): Promise<string | null> {
    if (isWeb) {
      try {
        return window.localStorage.getItem(KEY);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(KEY);
  },

  async set(token: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.setItem(KEY, token);
      } catch {
        /* navigation privée : la session dure le temps de la page */
      }
      return;
    }
    await SecureStore.setItemAsync(KEY, token);
  },

  async clear(): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* rien à effacer */
      }
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  },
};
