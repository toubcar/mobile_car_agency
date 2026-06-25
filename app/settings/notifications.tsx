import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileService } from '@/services/profile.service';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { useResponsiveLayout } from '@/utils/responsiveLayout';
import { registerPushTokenWithBackend, requestPushPermissions } from '@/services/pushNotifications.service';

const SECTIONS = [
  {
    title: 'Réservations',
    items: [
      { key: 'bookingConfirmed', label: 'Réservation confirmée', sub: 'Lorsqu’une demande est approuvée' },
      { key: 'bookingReminder', label: 'Rappel de location', sub: '24 h avant le départ' },
      { key: 'bookingCancelled', label: 'Réservation annulée', sub: 'Lorsqu’une réservation est annulée' },
    ],
  },
  {
    title: 'Messages',
    items: [
      { key: 'newMessages', label: 'Nouveaux messages', sub: 'Messages des agences ou clients' },
    ],
  },
  {
    title: 'Promotions',
    items: [
      { key: 'specialOffers', label: 'Offres spéciales', sub: 'Réductions et promotions' },
      { key: 'news', label: 'Actualités ToubCar', sub: 'Nouveautés et mises à jour' },
    ],
  },
];

const DEFAULT_PREFS: Record<string, boolean> = {
  notifications_push: true,
  bookingConfirmed: true,
  bookingReminder: true,
  bookingCancelled: true,
  newMessages: true,
  specialOffers: false,
  news: false,
};

const PUSH_SECTION = {
  title: 'Appareil',
  items: [
    {
      key: 'notifications_push',
      label: 'Notifications push',
      sub: 'Recevoir les alertes même lorsque l’app est fermée',
    },
  ],
};

export default function NotificationsScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isCompact, scrollContentStyle, headerGradientHeight, contentPad } = useResponsiveLayout();
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
    mutationFn: (mobile: Record<string, boolean>) =>
      profileService.updatePreferences({
        mobile,
        notifications_email: mobile.bookingConfirmed ?? true,
        marketing_emails: mobile.specialOffers ?? false,
        notifications_sms: mobile.newMessages ?? true,
      }),
    onError: () => Alert.alert('Erreur', 'Impossible d’enregistrer les préférences.'),
  });

  const toggle = useCallback(
    (key: string) => {
      void (async () => {
        const nextValue = !prefs[key];

        if (key === 'notifications_push' && nextValue) {
          const granted = await requestPushPermissions();
          if (!granted) {
            Alert.alert(
              'Autorisation requise',
              'Activez les notifications dans les réglages de votre téléphone pour recevoir les alertes ToubCar.',
            );
            return;
          }
          await registerPushTokenWithBackend();
        }

        setPrefs((p) => {
          const next = { ...p, [key]: nextValue };
          if (isAuthenticated) saveMutation.mutate(next);
          return next;
        });
      })();
    },
    [isAuthenticated, saveMutation, prefs],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#C8E6F5', COLORS.background]}
        style={[styles.headerGradient, { height: headerGradientHeight }]}
      />
      <PageHeader title="Notifications" />

      {!isAuthenticated ? (
        <Text style={[styles.hint, { paddingHorizontal: contentPad }]}>
          Connectez-vous pour synchroniser vos préférences avec le serveur.
        </Text>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {[PUSH_SECTION, ...SECTIONS].map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View
                  key={item.key}
                  style={[styles.row, isCompact && styles.rowCompact, i < section.items.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowLabel, isCompact && styles.rowLabelCompact]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={2}>
                      {item.sub}
                    </Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                    style={isCompact ? styles.switchCompact : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  hint: { fontSize: 13, color: COLORS.gray, marginBottom: 8, fontWeight: '500' },
  scroll: { paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCompact: { paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLeft: { flex: 1, paddingRight: 8, minWidth: 0 },
  rowLabel: { fontSize: 15, color: COLORS.black, fontWeight: '700' },
  rowLabelCompact: { fontSize: 14 },
  rowSub: { fontSize: 12, color: COLORS.gray, marginTop: 3, fontWeight: '500' },
  switchCompact: { transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] },
});
