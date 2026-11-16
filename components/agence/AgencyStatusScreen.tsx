import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BACKEND_URL } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useLogout';
import { profileService } from '@/services/profile.service';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { t } from '@/i18n';
import type { UserAgencyStatus } from '@/types';

type Pending = Exclude<UserAgencyStatus['status'], 'approved'>;

const LOOK: Record<Pending, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  pending: { icon: 'hourglass-outline', color: '#D97706' },
  rejected: { icon: 'close-circle-outline', color: '#DC2626' },
  suspended: { icon: 'pause-circle-outline', color: '#6B7280' },
};

/**
 * What an agency sees instead of its back-office while the administration has not approved it,
 * has rejected it or has suspended it: the website's "pending", "rejected" and "suspended" pages.
 */
export default function AgencyStatusScreen({ agency }: { agency: UserAgencyStatus | null | undefined }) {
  const router = useRouter();
  const logout = useLogout();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [checking, setChecking] = useState(false);

  const status = (agency?.status ?? 'pending') as Pending;
  const look = LOOK[status] ?? LOOK.pending;

  const title =
    status === 'rejected' ? t('Demande rejetée')
    : status === 'suspended' ? t('Compte suspendu')
    : t('Demande en cours d\'examen');

  const text =
    status === 'rejected'
      ? t('L\'administration n\'a pas retenu votre demande pour le moment.')
      : status === 'suspended'
        ? t('Votre agence est suspendue : vos véhicules ne sont plus proposés et les réservations sont bloquées.')
        : t('Votre agence est en attente de validation par l\'administrateur. Vous serez prévenu dès qu\'elle sera approuvée.');

  const reason = status === 'rejected' ? agency?.rejection_reason : status === 'suspended' ? agency?.suspension_reason : null;

  const refresh = async () => {
    setChecking(true);
    try {
      updateUser(await profileService.get());
    } catch {
      /* hors ligne : on garde l'écran */
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.iconWrap, { backgroundColor: `${look.color}1A` }]}>
          <Ionicons name={look.icon} size={44} color={look.color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>

        {reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>{t('Motif')}</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ) : null}

        {status === 'rejected' && agency?.max_tries ? (
          <Text style={styles.tries}>{t('Tentative :count sur :max', { count: agency.tries_count ?? 1, max: agency.max_tries })}</Text>
        ) : null}

        <TouchableOpacity style={styles.primary} onPress={refresh} disabled={checking} activeOpacity={0.85}>
          {checking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{t('Actualiser mon statut')}</Text>}
        </TouchableOpacity>

        {status === 'rejected' ? (
          <TouchableOpacity style={styles.secondary} onPress={() => void Linking.openURL(`${BACKEND_URL}/login`)} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>{t('Corriger ma demande sur le site')}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/support')} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>{t('Contacter l\'assistance')}</Text>
        </TouchableOpacity>

        <View style={styles.language}>
          <LanguageSwitcher />
        </View>

        <TouchableOpacity onPress={() => void logout()} activeOpacity={0.7}>
          <Text style={styles.logout}>{t('Se déconnecter')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  iconWrap: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  text: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  reasonBox: { alignSelf: 'stretch', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 4 },
  reasonLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  tries: { fontSize: 12, color: '#9CA3AF' },
  primary: { alignSelf: 'stretch', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondary: { alignSelf: 'stretch', borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  language: { alignSelf: 'stretch', marginTop: 8 },
  logout: { fontSize: 14, fontWeight: '700', color: '#DC2626', marginTop: 8 },
});
