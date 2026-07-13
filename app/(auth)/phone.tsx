import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { replaceRootByRole } from '@/utils/replaceByRole';

const { width } = Dimensions.get('window');
const CODE_LENGTH = 6;

type Step = 'phone' | 'otp';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { loginWithToken } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const animate = useCallback(() => {
    fadeIn.setValue(0);
    slideUp.setValue(30);
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  useEffect(() => { animate(); }, [step]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 8) {
      Alert.alert('Numéro invalide', 'Veuillez entrer un numéro valide.');
      return;
    }
    setLoading(true);
    try {
      const e164 = `+212${cleaned}`;
      const r = await authService.sendPhoneOtp(e164);
      setStep('otp');
      setCountdown(60);

      if (r.dev_code) {
        const digits = String(r.dev_code).split('');
        setOtpDigits(digits);
        Alert.alert('Mode développement', `Code OTP : ${r.dev_code}`);
      } else {
        Alert.alert(
          'Code envoyé',
          'Si vous ne recevez pas le SMS sous 2 minutes, vérifiez le numéro (+212) ou réessayez.',
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible d\'envoyer le code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otpDigits.join('');
    if (code.length < CODE_LENGTH) {
      Alert.alert('Code incomplet', 'Entrez les 6 chiffres du code reçu.');
      return;
    }
    setLoading(true);
    try {
      const e164 = `+212${phone.replace(/\s/g, '')}`;
      const res = await authService.verifyPhoneOtp(e164, code);
      await loginWithToken(res.token, res.user);
      replaceRootByRole(router, res.user.role);
    } catch (e: any) {
      Alert.alert('Code incorrect', e.response?.data?.message || 'Le code est invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (text: string, idx: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleDigitKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpDigits(['', '', '', '', '', '']);
    } else {
      router.back();
    }
  };

  return (
    <LinearGradient
      colors={['#C8E6F5', '#B0D8EF', '#98CAE9']}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Back button — always visible above scroll */}
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={18} color="#1A1A2E" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
            >
              {step === 'phone' ? (
                <>
                  <View style={styles.iconCircle}>
                    <Ionicons name="phone-portrait-outline" size={40} color="#1D3557" />
                  </View>

                  <Text style={styles.title}>Votre numéro</Text>
                  <Text style={styles.sub}>
                    Entrez votre numéro de téléphone.{'\n'}Nous vous enverrons un code de vérification.
                  </Text>

                  <View style={styles.phoneRow}>
                    <View style={styles.countryPill}>
                      <Text style={styles.flag}>🇲🇦</Text>
                      <Text style={styles.dialCode}>+212</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="6 XX XX XX XX"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      maxLength={12}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                    onPress={handleSendOTP}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.primaryBtnText}>ENVOYER LE CODE</Text>
                    }
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.iconCircle}>
                    <Ionicons name="shield-checkmark-outline" size={40} color="#1D3557" />
                  </View>

                  <Text style={styles.title}>Vérification</Text>
                  <Text style={styles.sub}>
                    Code envoyé au{'\n'}
                    <Text style={styles.phoneHighlight}>+212 {phone}</Text>
                  </Text>

                  <View style={styles.otpRow}>
                    {otpDigits.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={ref => { inputRefs.current[idx] = ref; }}
                        style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                        value={digit}
                        onChangeText={t => handleDigitChange(t, idx)}
                        onKeyPress={e => handleDigitKeyPress(e, idx)}
                        keyboardType="numeric"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                    onPress={handleVerifyOTP}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.primaryBtnText}>VÉRIFIER</Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={countdown > 0 ? undefined : handleSendOTP}
                    activeOpacity={countdown > 0 ? 1 : 0.7}
                  >
                    <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                      {countdown > 0 ? `Renvoyer dans ${countdown}s` : 'Renvoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  backBtn: {
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 10,
  },

  sub: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },

  phoneHighlight: {
    color: '#1D3557',
    fontWeight: '700',
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },

  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
  },

  flag: { fontSize: 18 },

  dialCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A2E',
    letterSpacing: 1,
  },

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
    justifyContent: 'center',
  },

  otpBox: {
    width: (width - 56 - 50) / CODE_LENGTH,
    aspectRatio: 0.9,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  otpBoxFilled: {
    backgroundColor: 'rgba(29,53,87,0.12)',
    borderColor: '#1D3557',
  },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#1D3557',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },

  primaryBtnDisabled: { opacity: 0.6 },

  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2,
  },

  resendBtn: { paddingVertical: 8 },

  resendText: {
    fontSize: 13,
    color: '#1D3557',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  resendTextDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'none',
  },
});
