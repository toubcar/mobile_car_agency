import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { COLORS, APP_NAME } from '@/constants/api';
import { replaceRootByRole } from '@/utils/replaceByRole';
import { goToHome } from '@/utils/authNavigation';

export default function LoginScreen() {
  const router = useRouter();
  const { scope, required } = useLocalSearchParams<{ scope?: string; required?: string }>();
  const isStaff = scope === 'staff';
  const forceLogin = required === '1';
  const { login, isLoading, isAuthenticated, isAuthReady } = useAuthStore();

  /**
   * Session expirée ou route restaurée sur login staff → accueil public (catalogue).
   * Depuis welcome, « Espace pro » ouvre login avec canGoBack() → l’écran reste affiché.
   */
  useEffect(() => {
    if (!isAuthReady || !isStaff || isAuthenticated) return;
    if (forceLogin || !router.canGoBack()) {
      goToHome(router);
    }
  }, [isAuthReady, isAuthenticated, isStaff, forceLogin, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    goToHome(router);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login(email.trim(), password);
      replaceRootByRole(router, useAuthStore.getState().role);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      Alert.alert('Connexion impossible', msg ?? 'Vérifiez votre e-mail et votre mot de passe.');
    }
  };

  return (
    <LinearGradient colors={['#F0F8FF', '#FFFFFF', '#FFFFFF']} style={styles.root} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.logoCircle, isStaff && styles.logoCircleStaff]}>
                <Ionicons name={isStaff ? 'briefcase' : 'person'} size={28} color="#FFF" />
              </View>
              {isStaff ? (
                <>
                  <Text style={styles.kicker}>{APP_NAME} Pro</Text>
                  <Text style={styles.title}>Espace professionnel</Text>
                  <Text style={styles.subtitle}>
                    Connexion réservée aux agences partenaires et à l’équipe {APP_NAME}.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Bon retour</Text>
                  <Text style={styles.subtitle}>Connectez-vous pour réserver et suivre vos locations.</Text>
                </>
              )}
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Adresse e-mail</Text>
                <View style={[styles.inputRow, focused === 'email' && styles.inputRowFocused]}>
                  <Ionicons name="mail-outline" size={18} color={focused === 'email' ? COLORS.primary : '#9CA3AF'} />
                  <TextInput
                    style={styles.input}
                    placeholder="email@exemple.com"
                    placeholderTextColor="#C7C7CC"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mot de passe</Text>
                <View style={[styles.inputRow, focused === 'password' && styles.inputRowFocused]}>
                  <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? COLORS.primary : '#9CA3AF'} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="#C7C7CC"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleLogin} activeOpacity={0.85} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Se connecter</Text>}
              </TouchableOpacity>
            </View>

            {!isStaff ? (
              <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/(auth)/onboarding')} activeOpacity={0.7}>
                <Text style={styles.footerLinkText}>
                  Pas encore de compte ? <Text style={styles.footerLinkBold}>S’inscrire</Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.footerLink} onPress={() => goToHome(router)} activeOpacity={0.7}>
                <Text style={styles.footerLinkText}>Retour à l’accueil voyageur</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  kicker: {
    fontSize: 11, fontWeight: '800', color: COLORS.secondary,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  logoCircle: {
    width: 68, height: 68, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  logoCircleStaff: { backgroundColor: '#0F766E' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  inputRowFocused: { borderColor: COLORS.primary, backgroundColor: '#FAFCFF' },
  input: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
  btn: {
    marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  footerLink: { marginTop: 28, alignItems: 'center' },
  footerLinkText: { fontSize: 14, color: '#6B7280' },
  footerLinkBold: { color: COLORS.primary, fontWeight: '700' },
});
