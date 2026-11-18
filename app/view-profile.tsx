import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants/api';
import PageHeader from '@/components/PageHeader';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

import { t } from '@/i18n';

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  agence: 'Agence',
  admin: 'Administrateur',
};

function InfoRow({ label, value, isCompact }: { label: string; value: string; isCompact: boolean }) {
  return (
    <View style={[styles.infoRow, isCompact && styles.infoRowCompact]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, isCompact && styles.infoValueCompact]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export default function ViewProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isCompact, scrollContentStyle, headerGradientHeight } = useResponsiveLayout();

  const displayName = user?.name
    ? user.name
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Utilisateur';

  const initials = displayName
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const email =
    user?.email && !user.email.includes('@toubcar.app') ? user.email : '—';

  const INFO = [
    { label: t('Nom complet'), value: displayName },
    { label: t('E-mail'), value: email },
    { label: t('Téléphone'), value: user?.phone || '—' },
    { label: t('Rôle'), value: ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#C8E6F5', COLORS.background]}
        style={[styles.headerGradient, { height: headerGradientHeight }]}
      />
      <PageHeader title={t('Profil')} />

      <ScrollView
        contentContainerStyle={[styles.scroll, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, isCompact && styles.heroCardCompact]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={[styles.avatar, isCompact && styles.avatarCompact]}
          >
            <Text style={[styles.avatarText, isCompact && styles.avatarTextCompact]}>{initials}</Text>
          </LinearGradient>
          <Text style={[styles.name, isCompact && styles.nameCompact]} numberOfLines={2}>
            {displayName}
          </Text>
          {email !== '—' ? (
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t('Informations')}</Text>
        <View style={styles.card}>
          {INFO.map((item, i) => (
            <View key={item.label} style={i < INFO.length - 1 ? styles.infoRowBorder : undefined}>
              <InfoRow label={item.label} value={item.value} isCompact={isCompact} />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.editBtn, isCompact && styles.editBtnCompact]}
          onPress={() => router.push('/settings/personal-info')}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnText}>{t('Modifier le profil')}</Text>
        </TouchableOpacity>
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
  scroll: { paddingTop: 8, flexGrow: 1 },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  heroCardCompact: { paddingVertical: 22, paddingHorizontal: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarCompact: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarText: { color: COLORS.white, fontSize: 30, fontWeight: '800' },
  avatarTextCompact: { fontSize: 24 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  nameCompact: { fontSize: 19 },
  email: { fontSize: 14, color: COLORS.gray, marginTop: 4, fontWeight: '500', textAlign: 'center' },
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
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  infoRowCompact: { paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.black },
  infoValueCompact: { fontSize: 14 },
  editBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  editBtnCompact: { paddingVertical: 14 },
  editBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
