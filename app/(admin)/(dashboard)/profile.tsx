import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';
import { ADMIN_BG, adminStyles, adminShadow } from '@/constants/adminTheme';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useLogout';

import { t, dirIcon } from '@/i18n';

const SHADOW = adminShadow.card;

function Row({ icon, label, sub, onPress, danger }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? '#FF3B30' : COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: '#FF3B30' }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {!danger ? <Ionicons name={dirIcon('chevron-forward')} size={15} color="#C7C7CC" /> : null}
    </TouchableOpacity>
  );
}

export default function AdminProfileScreen() {
  const { user } = useAuthStore();
  const logoutAndGoHome = useLogout();

  const initials = (user?.name ?? 'A')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('');

  const handleLogout = () =>
    Alert.alert(t('Se déconnecter'), t('Quitter la session admin ?'), [
      { text: t('Annuler'), style: 'cancel' },
      {
        text: t('Se déconnecter'),
        style: 'destructive',
        onPress: () => {
          void logoutAndGoHome();
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>{t('Administrateur')}</Text>
            <Text style={styles.name}>{user?.name ?? '—'}</Text>
            <Text style={styles.email}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={13} color="#D6EAF8" />
            <Text style={styles.badgeTxt}>{t('Admin')}</Text>
          </View>
        </View>

        <Text style={adminStyles.sectionLabel}>SESSION</Text>
        <View style={styles.group}>
          <Row icon="log-out-outline" label={t('Se déconnecter')} sub={t("Retour à l'accueil public")} onPress={handleLogout} danger />
        </View>

        <Text style={styles.footer}>{t('ToubCar · Administration')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { paddingBottom: 48, paddingTop: 12 },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 3 },
  email: { fontSize: 12, color: '#D6EAF8', marginTop: 3, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#D6EAF8' },

  section: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D6D72',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 16,
  },
  group: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...SHADOW,
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FEF2F2' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rowSub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },

  footer: { textAlign: 'center', fontSize: 12, color: '#C7C7CC', marginTop: 32 },
});
