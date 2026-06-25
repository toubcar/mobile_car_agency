import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
export default function WelcomeScreen() {
  const router = useRouter();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#E8F4FC', '#D6EAF8', '#B8D4E8']}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.hero}>
            <Image
              source={require('../../assets/toubcar-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Votre prochain trajet{'\n'}commence ici</Text>
            <Text style={styles.subtitle}>
              Parcourez les véhicules disponibles, réservez en quelques clics, ou connectez-vous pour gérer vos locations.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.88}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryBtnText}>Explorer sans compte</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login?scope=client')}
          >
            <Text style={styles.secondaryBtnText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/onboarding')}
          >
            <Text style={styles.outlineBtnText}>Créer un compte</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.proBtn}
            activeOpacity={0.75}
            onPress={() => router.push('/(auth)/login?scope=staff')}
          >
            <Ionicons name="briefcase-outline" size={18} color="#4B5563" />
            <Text style={styles.proBtnText}>Espace agence ou administrateur</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1D3557',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  secondaryBtnText: { color: '#1D3557', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1D3557',
    backgroundColor: 'transparent',
  },
  outlineBtnText: { color: '#1D3557', fontSize: 15, fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,46,0.12)',
    marginBottom: 16,
    width: '100%',
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  proBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
