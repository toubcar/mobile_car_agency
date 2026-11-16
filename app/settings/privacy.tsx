import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileService } from '@/services/profile.service';
import { useAuthStore } from '@/store/authStore';

import { t } from '@/i18n';

const ITEMS = [
  { key: 'publicProfile', get label() { return t('Profil public'); }, get sub() { return t('Tout le monde peut voir votre page profil'); } },
  { key: 'shareActivity', get label() { return t('Partager l’activité'); }, get sub() { return t('Partager vos réservations avec ToubCar'); } },
  { key: 'location', get label() { return t('Localisation'); }, get sub() { return t('Activer la position précise pendant les trajets'); } },
  { key: 'analytics', get label() { return t('Analytique et cookies'); }, get sub() { return t('Nous aider à améliorer l’application'); } },
  { key: 'personalizedAds', get label() { return t('Publicités personnalisées'); }, get sub() { return t('Annonces adaptées à vos centres d’intérêt'); } },
];

const DEFAULT_PREFS: Record<string, boolean> = {
  publicProfile: true,
  shareActivity: false,
  location: true,
  analytics: true,
  personalizedAds: false,
};

export default function PrivacyScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);

  const { data, isLoading } = useQuery({
    queryKey: ['profile-preferences'],
    queryFn: profileService.getPreferences,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (data?.mobile) {
      setPrefs({ ...DEFAULT_PREFS, ...(data.mobile as Record<string, boolean>) });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (mobile: Record<string, boolean>) => profileService.updatePreferences({ mobile }),
    onError: () => Alert.alert(t('Erreur'), t('Impossible d’enregistrer les préférences.')),
  });

  const toggle = useCallback((key: string) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      if (isAuthenticated) saveMutation.mutate(next);
      return next;
    });
  }, [isAuthenticated, saveMutation]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Confidentialité')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isAuthenticated ? (
        <Text style={styles.hint}>{t('Connectez-vous pour synchroniser avec Laravel (client.preferences).')}</Text>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#1D3557" />
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('PARAMÈTRES DE CONFIDENTIALITÉ')}</Text>
        <View style={styles.card}>
          {ITEMS.map((item, i) => (
            <View
              key={item.key}
              style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#E5E5EA', true: '#000' }}
                thumbColor="#FFF"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  hint: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 8 },
  scroll: { paddingVertical: 8, paddingBottom: 48 },
  sectionTitle: { fontSize: 12, color: '#6D6D72', paddingHorizontal: 20, marginBottom: 6, marginTop: 16, letterSpacing: 0.3 },
  card: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8', marginLeft: 16 },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowLabel: { fontSize: 16, color: '#000', fontWeight: '400' },
  rowSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
});
