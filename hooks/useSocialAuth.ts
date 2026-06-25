import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '@/constants/api';
import { authService } from '@/services/auth.service';
import { replaceRootByRole } from '@/utils/replaceByRole';
import { useAuthStore } from '@/store/authStore';

type SocialAuthOptions = {
  redirectAfterLogin?: string | null;
  onBeforeNavigate?: () => void;
};

/** Google + Apple — même logique que onboarding (Socialite + Sanctum). */
export function useSocialAuth(options?: SocialAuthOptions) {
  const router = useRouter();
  const { loginWithToken } = useAuthStore();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const handleGoogle = useCallback(async () => {
    setLoadingGoogle(true);
    try {
      const redirectUri = Linking.createURL('auth/callback');
      const authUrl = `${BACKEND_URL}/auth/google/redirect?redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type !== 'success') return;

      const urlParams = new URLSearchParams(result.url.split('?')[1] ?? '');
      const token = urlParams.get('token');
      const userJson = urlParams.get('user');
      const error = urlParams.get('error');

      if (error) throw new Error(decodeURIComponent(error));
      if (!token) throw new Error('Token introuvable.');

      const user = JSON.parse(decodeURIComponent(userJson ?? '{}'));
      await SecureStore.setItemAsync('auth_token', token);
      await loginWithToken(token, user);
      options?.onBeforeNavigate?.();
      setTimeout(() => {
        if (options?.redirectAfterLogin) {
          router.push(options.redirectAfterLogin as never);
        } else {
          replaceRootByRole(router, user.role);
        }
      }, 320);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connexion impossible.';
      Alert.alert('Erreur Google', msg);
    } finally {
      setLoadingGoogle(false);
    }
  }, [loginWithToken, options, router]);

  const handleApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple ID', 'Apple Sign In est disponible uniquement sur iOS.');
      return;
    }
    setLoadingApple(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('Jeton Apple indisponible. Réessayez ou utilisez un autre mode de connexion.');
      }
      const fullName = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : undefined;
      const res = await authService.loginWithApple(identityToken, fullName || undefined);
      await loginWithToken(res.token, res.user);
      options?.onBeforeNavigate?.();
      setTimeout(() => {
        if (options?.redirectAfterLogin) {
          router.push(options.redirectAfterLogin as never);
        } else {
          replaceRootByRole(router, res.user.role);
        }
      }, 320);
    } catch (e: unknown) {
      const err = e as { code?: string; response?: { data?: { message?: string } } };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Erreur Apple', err.response?.data?.message ?? 'Connexion Apple impossible.');
      }
    } finally {
      setLoadingApple(false);
    }
  }, [loginWithToken, options, router]);

  return { handleGoogle, handleApple, loadingGoogle, loadingApple };
}
