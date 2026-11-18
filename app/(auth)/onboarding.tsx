import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocialAuth } from '@/hooks/useSocialAuth';

import { t, dirIcon } from '@/i18n';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { handleGoogle, handleApple, loadingGoogle, loadingApple } = useSocialAuth();
  const [email, setEmail] = useState('');

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleEmailSignUp = () => {
    router.push(
      email.trim()
        ? { pathname: '/(auth)/register', params: { email: email.trim() } }
        : '/(auth)/register'
    );
  };

  return (
    <LinearGradient
      colors={['#C8E6F5', '#B0D8EF', '#98CAE9']}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {router.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name={dirIcon('arrow-back')} size={18} color="#1A1A2E" />
          </TouchableOpacity>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/toubcar-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{t('C’est parti')}</Text>

            {/* ── Google ── */}
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.75}
              onPress={handleGoogle}
              disabled={loadingGoogle}
            >
              {loadingGoogle
                ? <ActivityIndicator color="#1A1A2E" style={{ flex: 1 }} />
                : <Text style={styles.socialBtnText}>{t('CONTINUER AVEC GOOGLE')}</Text>
              }
              <Image source={require('../../assets/google-logo.png')} style={styles.socialIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* ── Apple ── */}
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.75}
              onPress={handleApple}
              disabled={loadingApple}
            >
              {loadingApple
                ? <ActivityIndicator color="#1A1A2E" style={{ flex: 1 }} />
                : <Text style={styles.socialBtnText}>{t('CONTINUER AVEC APPLE ID')}</Text>
              }
              <Image source={require('../../assets/apple-logo.png')} style={styles.appleIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* ── Phone ── */}
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.75}
              onPress={() => router.push('/(auth)/phone')}
            >
              <Text style={styles.socialBtnText}>{t('CONTINUER AVEC UN NUMÉRO')}</Text>
              <Image source={require('../../assets/phone-logo.png')} style={styles.socialIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('OU INSCRIPTION PAR EMAIL')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Email ── */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('E-mail')}
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity style={styles.signUpBtn} activeOpacity={0.85} onPress={handleEmailSignUp}>
              <Text style={styles.signUpBtnText}>{t("S'INSCRIRE")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login?scope=client')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkText}>
                {t('Déjà un compte ?')} <Text style={styles.loginLinkHighlight}>{t('Se connecter')}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.guestLinkText}>{t('Explorer sans compte')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proLoginBtn}
              onPress={() => router.push('/(auth)/login?scope=staff')}
              activeOpacity={0.7}
            >
              <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
              <Text style={styles.proLoginText}>{t('Espace agence ou administrateur')}</Text>
              <Ionicons name={dirIcon('chevron-forward')} size={14} color="#6B7280" />
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea:  { flex: 1 },

  backBtn: {
    marginLeft: 16,
    marginTop: 8,
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
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  logoSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  logoImage:   { width: 150, height: 150 },

  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#1A1A2E',
    lineHeight: 39,
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 50,
    paddingHorizontal: 22,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    minHeight: 54,
  },
  socialBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.8,
    flex: 1,
  },
  socialIcon: { width: 24, height: 24 },
  appleIcon:  { width: 28, height: 28 },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(26,26,46,0.2)' },
  dividerText: { fontSize: 10, fontWeight: '600', color: '#4B5563', letterSpacing: 0.8 },

  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: 14,
  },
  input: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1A1A2E',
  },

  signUpBtn: {
    backgroundColor: '#2D2D2D',
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  signUpBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 2.5 },

  loginLink:          { alignItems: 'center', marginBottom: 14 },
  loginLinkText:      { fontSize: 14, color: '#374151' },
  guestLink:          { alignItems: 'center', marginBottom: 16 },
  guestLinkText:      { fontSize: 13, color: '#6B7280', fontWeight: '600', textDecorationLine: 'underline' },

  proLoginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 8, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  proLoginText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  loginLinkHighlight: { color: '#1D3557', fontWeight: '700' },
});
