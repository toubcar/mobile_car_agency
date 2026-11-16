import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/authStore';
import { replaceRootByRole } from '@/utils/replaceByRole';
import { COLORS } from '@/constants/api';

import { t } from '@/i18n';

/** Deep link `toubcar://auth/callback?token=...&user=...` après Google OAuth Laravel. */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; user?: string; error?: string }>();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  useEffect(() => {
    const run = async () => {
      try {
        if (params.error) {
          throw new Error(decodeURIComponent(String(params.error)));
        }
        const token = params.token;
        const userRaw = params.user;
        if (!token || !userRaw) {
          throw new Error(t('Réponse OAuth incomplète (token ou utilisateur manquant).'));
        }
        const user = JSON.parse(decodeURIComponent(String(userRaw)));
        await SecureStore.setItemAsync('auth_token', token);
        await loginWithToken(token, user);
        replaceRootByRole(router, user.role);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Connexion impossible.';
        Alert.alert(t('Erreur de connexion'), msg, [
          { text: t('Retour'), onPress: () => router.replace('/(auth)/onboarding') },
        ]);
      }
    };
    run();
  }, [params.token, params.user, params.error]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F8FF' },
});
