import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authService } from '@/services/auth.service';
import { replaceRootByRole } from '@/utils/replaceByRole';
import { useAuthStore } from '@/store/authStore';

import { t } from '@/i18n';

WebBrowser.maybeCompleteAuthSession();

type SocialAuthOptions = {
  redirectAfterLogin?: string | null;
  onBeforeNavigate?: () => void;
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_CLIENT_ID_PLACEHOLDER = 'not-configured.apps.googleusercontent.com';

/** Google + Apple — API mobile Sanctum (pas de redirection vers le site web). */
export function useSocialAuth(options?: SocialAuthOptions) {
  const router = useRouter();
  const { loginWithToken } = useAuthStore();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  // expo-auth-session throws while rendering when a client id is missing (an empty .env on a developer's machine
  // closed the whole app at start). The placeholder keeps it running: handleGoogle refuses to start without a real id.
  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
  });

  const finishGoogleLogin = useCallback(
    async (accessToken: string) => {
      const res = await authService.loginWithGoogle(accessToken);
      await loginWithToken(res.token, res.user);
      options?.onBeforeNavigate?.();
      setTimeout(() => {
        if (options?.redirectAfterLogin) {
          router.push(options.redirectAfterLogin as never);
        } else {
          replaceRootByRole(router, res.user.role);
        }
      }, 320);
    },
    [loginWithToken, options, router],
  );

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const accessToken = googleResponse.authentication?.accessToken;
    if (!accessToken) return;

    setLoadingGoogle(true);
    finishGoogleLogin(accessToken)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Connexion impossible.';
        Alert.alert(t('Erreur Google'), msg);
      })
      .finally(() => setLoadingGoogle(false));
  }, [googleResponse, finishGoogleLogin]);

  const handleGoogle = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        t('Google non configuré'),
        t('Ajoutez EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID dans le fichier .env mobile, puis reconstruisez l’application.'),
      );
      return;
    }

    setLoadingGoogle(true);
    try {
      const result = await promptGoogleAsync({ showInRecents: true });
      if (result.type === 'success' && result.authentication?.accessToken) {
        await finishGoogleLogin(result.authentication.accessToken);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connexion impossible.';
      Alert.alert(t('Erreur Google'), msg);
    } finally {
      setLoadingGoogle(false);
    }
  }, [finishGoogleLogin, promptGoogleAsync]);

  const handleApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(t('Apple ID'), t('Apple Sign In est disponible uniquement sur iOS.'));
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
        throw new Error(t('Jeton Apple indisponible. Réessayez ou utilisez un autre mode de connexion.'));
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
        Alert.alert(t('Erreur Apple'), err.response?.data?.message ?? t('Connexion Apple impossible.'));
      }
    } finally {
      setLoadingApple(false);
    }
  }, [loginWithToken, options, router]);

    return {
    handleGoogle,
    handleApple,
    loadingGoogle,
    loadingApple,
  };
}
