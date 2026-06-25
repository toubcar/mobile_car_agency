import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useAuthStore } from '@/store/authStore';
import { replaceRootByRole } from '@/utils/replaceByRole';
import type { AuthSheetMode } from '@/contexts/AuthSheetContext';
import type { User } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;
const DISMISS_THRESHOLD = 120;

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: AuthSheetMode;
  redirectAfterLogin?: string | null;
}

export default function AuthBottomSheet({
  visible,
  onClose,
  mode = 'signup',
  redirectAfterLogin = null,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<AuthSheetMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading: loginLoading } = useAuthStore();

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPassword('');
      setShowPass(false);
      onClose();
    });
  }, [onClose, translateY, backdropOpacity]);

  const finishLoginNavigation = useCallback(
    (role: User['role'] | null) => {
      close();
      setTimeout(() => {
        if (redirectAfterLogin) {
          router.push(redirectAfterLogin as never);
          return;
        }
        replaceRootByRole(router, role);
      }, 320);
    },
    [close, redirectAfterLogin, router],
  );

  const { handleGoogle, handleApple, loadingGoogle, loadingApple } = useSocialAuth({
    redirectAfterLogin,
    onBeforeNavigate: close,
  });

  useEffect(() => {
    if (visible) {
      setView(mode);
      translateY.setValue(SHEET_HEIGHT);
      open();
    }
  }, [visible, mode, open, translateY]);

  const navigateAfterClose = (path: string | { pathname: string; params?: Record<string, string> }) => {
    close();
    setTimeout(() => {
      if (typeof path === 'string') router.push(path as any);
      else router.push(path as any);
    }, 350);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login(email.trim(), password);
      finishLoginNavigation(useAuthStore.getState().role);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      Alert.alert('Connexion impossible', msg ?? 'Vérifiez votre e-mail et votre mot de passe.');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={['#C8E6F5', '#B0D8EF', '#98CAE9']}
            style={styles.gradientContent}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.logoSection}>
                <Image
                  source={require('../assets/toubcar-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              {view === 'login' ? (
                <>
                  <Text style={styles.title}>Bon retour</Text>
                  <Text style={styles.loginSub}>
                    Connectez-vous pour réserver et suivre vos locations.
                  </Text>

                  <View style={styles.loginField}>
                    <Ionicons name="mail-outline" size={18} color="#4B5563" />
                    <TextInput
                      style={styles.loginInput}
                      placeholder="E-mail"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.loginField}>
                    <Ionicons name="lock-closed-outline" size={18} color="#4B5563" />
                    <TextInput
                      style={styles.loginInput}
                      placeholder="Mot de passe"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPass}
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={handleEmailLogin}
                    />
                    <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                      <Ionicons
                        name={showPass ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.signUpBtn, loginLoading && styles.btnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleEmailLogin}
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.signUpBtnText}>SE CONNECTER</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setView('signup')} style={styles.loginLink}>
                    <Text style={styles.loginLinkText}>
                      Pas encore de compte ?{' '}
                      <Text style={styles.loginLinkHighlight}>S’inscrire</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.title}>C’est parti</Text>

                  <TouchableOpacity
                    style={styles.socialBtn}
                    activeOpacity={0.75}
                    onPress={handleGoogle}
                    disabled={loadingGoogle}
                  >
                    {loadingGoogle ? (
                      <ActivityIndicator color="#1A1A2E" style={{ flex: 1 }} />
                    ) : (
                      <Text style={styles.socialBtnText}>CONTINUER AVEC GOOGLE</Text>
                    )}
                    <Image source={require('../assets/google-logo.png')} style={styles.socialIcon} resizeMode="contain" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialBtn}
                    activeOpacity={0.75}
                    onPress={handleApple}
                    disabled={loadingApple}
                  >
                    {loadingApple ? (
                      <ActivityIndicator color="#1A1A2E" style={{ flex: 1 }} />
                    ) : (
                      <Text style={styles.socialBtnText}>CONTINUER AVEC APPLE ID</Text>
                    )}
                    <Image source={require('../assets/apple-logo.png')} style={styles.appleIcon} resizeMode="contain" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialBtn}
                    activeOpacity={0.75}
                    onPress={() => navigateAfterClose('/(auth)/phone')}
                  >
                    <Text style={styles.socialBtnText}>CONTINUER AVEC UN NUMÉRO</Text>
                    <Image source={require('../assets/phone-logo.png')} style={styles.socialIcon} resizeMode="contain" />
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OU INSCRIPTION PAR E-MAIL</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="E-mail"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.signUpBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigateAfterClose(
                        email.trim()
                          ? { pathname: '/(auth)/register', params: { email: email.trim() } }
                          : '/(auth)/register',
                      )
                    }
                  >
                    <Text style={styles.signUpBtnText}>S’INSCRIRE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setView('login')} style={styles.loginLink}>
                    <Text style={styles.loginLinkText}>
                      Déjà un compte ?{' '}
                      <Text style={styles.loginLinkHighlight}>Se connecter</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#C8E6F5',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 14,
    zIndex: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  gradientContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  logoSection: { alignItems: 'center', paddingTop: 4, paddingBottom: 4 },
  logoImage: { width: 110, height: 110 },
  title: {
    fontSize: 32,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#1A1A2E',
    lineHeight: 39,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginSub: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  loginField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  loginInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    padding: 0,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    minHeight: 54,
  },
  socialBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.6,
    flex: 1,
  },
  socialIcon: { width: 24, height: 24 },
  appleIcon: { width: 28, height: 28 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(26,26,46,0.2)' },
  dividerText: { fontSize: 10, fontWeight: '600', color: '#4B5563', letterSpacing: 0.8 },
  inputContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 50,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  input: { paddingHorizontal: 20, paddingVertical: 15, fontSize: 15, color: '#1A1A2E' },
  signUpBtn: {
    backgroundColor: '#2D2D2D',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  signUpBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 2.5 },
  loginLink: { alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: '#374151' },
  loginLinkHighlight: { color: '#E85D04', fontWeight: '700' },
});
