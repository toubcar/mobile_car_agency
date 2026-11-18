import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';
import { authService } from '@/services/auth.service';
import { t, dirIcon } from '@/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('Saisissez une adresse e-mail valide.'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      setSent(await authService.forgotPassword(email.trim()));
    } catch (err) {
      const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      setError(message ?? t('Envoi impossible.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F0F8FF', '#FFFFFF', '#FFFFFF']} style={styles.root} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name={dirIcon('chevron-back')} size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons name="key-outline" size={28} color="#FFF" />
              </View>
              <Text style={styles.title}>{t('Mot de passe oublié ?')}</Text>
              <Text style={styles.subtitle}>
                {t('Saisissez l\'adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.')}
              </Text>
            </View>

            {sent ? (
              <View style={styles.sentBox}>
                <Ionicons name="mail-open-outline" size={22} color={COLORS.success} />
                <Text style={styles.sentText}>{sent}</Text>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.fieldLabel}>{t('Adresse e-mail')}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="email@exemple.com"
                    placeholderTextColor="#C7C7CC"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={submit}
                  />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} activeOpacity={0.85} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{t('Envoyer le lien')}</Text>}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.footerLink} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.footerLinkText}>{t('Retour à la connexion')}</Text>
            </TouchableOpacity>
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  form: { gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
  error: { fontSize: 13, color: COLORS.error },
  btn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sentBox: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: 14, padding: 16 },
  sentText: { flex: 1, fontSize: 14, color: '#065F46', lineHeight: 20 },
  footerLink: { marginTop: 28, alignItems: 'center' },
  footerLinkText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});
