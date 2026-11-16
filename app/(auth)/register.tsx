import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { replaceRootByRole } from '@/utils/replaceByRole';

import { t, dirIcon } from '@/i18n';

const { width: W } = Dimensions.get('window');

const SOURCES = [
  'Facebook',
  'Instagram',
  'Google',
  'Recommandation d’un ami',
  'Recommandation d’une agence',
  'Autre',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { type, email: emailParam } = useLocalSearchParams<{ type?: string; email?: string }>();
  const { register, isLoading } = useAuthStore();

  const accountType = type === 'agency' ? 'agency' : 'client';

  /* ── Step state ── */
  const [step, setStep] = useState(1); // 1 | 2 | 3

  /* ── Step 1 fields ── */
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState(typeof emailParam === 'string' ? emailParam : '');
  const [phone, setPhone] = useState('');

  /* ── Step 2 fields ── */
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* ── Step 3 ── */
  const [source, setSource] = useState('');

  /* ── Password rules ── */
  const rules = [
    { label: t('1 majuscule'), ok: /[A-Z]/.test(password) },
    { label: t('1 minuscule'), ok: /[a-z]/.test(password) },
    { label: t('1 chiffre'), ok: /[0-9]/.test(password) },
    { label: t('8 à 16 caractères'), ok: password.length >= 8 && password.length <= 16 },
    { label: t('1 caractère spécial'), ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordValid = rules.every((r) => r.ok);

  /* ── Step 1 validation ── */
  const step1Valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 8;

  /* ── Navigation ── */
  const goBack = () => {
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  };

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      Alert.alert(t('Champs requis'), t('Veuillez remplir tous les champs correctement.'));
      return;
    }
    if (step === 2 && !passwordValid) {
      Alert.alert(t('Mot de passe faible'), t('Le mot de passe doit respecter toutes les règles.'));
      return;
    }
    setStep((s) => s + 1);
  };

  /* ── Final submit ── */
  const handleSubmit = async () => {
    try {
      await register(name.trim(), email.trim(), password, phone.trim());
      replaceRootByRole(router, useAuthStore.getState().role);
    } catch (error: any) {
      Alert.alert(t('Inscription échouée'), error?.response?.data?.message ?? t('Une erreur est survenue.'));
    }
  };

  return (
    <LinearGradient
      colors={['#C8E6F5', '#B0D8EF', '#98CAE9']}
      style={styles.gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

          {/* ── Top nav ── */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
              <Ionicons name={dirIcon('arrow-back')} size={18} color="#1A1A2E" />
            </TouchableOpacity>

            {/* Step dots */}
            <View style={styles.dots}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={[styles.dot, step >= n && styles.dotActive]} />
              ))}
            </View>

            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/toubcar-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* ── STEP 1: Personal info ── */}
            {step === 1 && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>
                  {accountType === 'agency' ? t('Votre agence') : t('Vos informations')}
                </Text>
                <Text style={styles.stepSub}>
                  {accountType === 'agency'
                    ? t('Présentez votre agence')
                    : t('Créez votre compte client')}
                </Text>

                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={17} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={accountType === 'agency' ? t('Nom de l’agence') : t('Nom complet')}
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={17} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('Adresse e-mail')}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={17} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('Numéro de téléphone')}
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {/* ── STEP 2: Password ── */}
            {step === 2 && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>{t('Créez votre')}{'\n'}{t('mot de passe')}</Text>
                <Text style={styles.stepSub}>{t('Choisissez un mot de passe robuste')}</Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={t('Mot de passe')}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>

                {/* Requirements */}
                <View style={styles.rules}>
                  {rules.map((r) => (
                    <View key={r.label} style={styles.ruleRow}>
                      <View style={[styles.ruleDot, r.ok && styles.ruleDotOk]} />
                      <Text style={[styles.ruleText, r.ok && styles.ruleTextOk]}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── STEP 3: Source ── */}
            {step === 3 && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>{t('Bienvenue sur')}{'\n'}{t('ToubCar !')}</Text>
                <Text style={styles.stepSub}>{t('Comment avez-vous entendu parler de nous ?')}</Text>

                <View style={styles.sourceList}>
                  {SOURCES.map((s) => {
                    const isLast     = s === 'Autre';
                    const isSelected = source === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.sourceBtn,
                          isLast     ? styles.sourceBtnLight    : styles.sourceBtnDark,
                          isSelected ? styles.sourceBtnSelected : null,
                        ]}
                        onPress={() => setSource(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.sourceBtnText,
                          isLast ? styles.sourceBtnTextLight : styles.sourceBtnTextDark,
                        ]}>
                          {s}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color={isLast ? '#1D3557' : '#FFFFFF'} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── Bottom button ── */}
          <View style={styles.footer}>
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.nextBtn, step === 1 && !step1Valid && styles.nextBtnDisabled]}
                onPress={goNext}
                activeOpacity={0.88}
                disabled={step === 1 && !step1Valid}
              >
                <Text style={styles.nextBtnText}>SUIVANT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, (!source || isLoading) && styles.nextBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.88}
                disabled={!source || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.nextBtnText}>{t('CRÉER LE COMPTE')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },

  /* Top nav */
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(29,53,87,0.2)',
  },
  dotActive: { backgroundColor: '#1D3557', width: 20, borderRadius: 4 },

  /* Scroll */
  scroll: { paddingHorizontal: 24, paddingBottom: 16 },

  /* Logo */
  logoRow: { alignItems: 'center', paddingVertical: 12 },
  logo: { width: 150, height: 150 },

  /* Step block */
  stepBlock: { paddingTop: 4 },
  stepTitle: {
    fontSize: 34,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#1A1A2E',
    lineHeight: 42,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 28,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* Inputs */
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
  },
  eyeBtn: { paddingLeft: 8 },

  /* Password rules */
  rules: { gap: 10, marginTop: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    backgroundColor: 'transparent',
  },
  ruleDotOk: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
  ruleText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  ruleTextOk: { color: '#1D3557', fontWeight: '700' },

  /* Source options */
  sourceList: { gap: 10 },
  sourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  sourceBtnDark: {
    backgroundColor: '#2D2D2D',
  },
  sourceBtnLight: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  sourceBtnSelected: {
    borderWidth: 2,
    borderColor: '#1D3557',
  },
  sourceBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  sourceBtnTextDark:  { color: '#FFFFFF' },
  sourceBtnTextLight: { color: '#1A1A2E' },

  /* Footer button */
  footer: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 12 },
  nextBtn: {
    backgroundColor: '#2D2D2D',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  nextBtnDisabled: { backgroundColor: 'rgba(45,45,45,0.45)' },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2.5,
  },
});
