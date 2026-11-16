import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { agencyService } from '@/services/agency.service';

import { t, dirIcon } from '@/i18n';

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
  onPress?: () => void;
}) {
  if (!value) return null;
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
      {onPress ? <Ionicons name={dirIcon('chevron-forward')} size={16} color={COLORS.gray} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function AgencyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agencyId = Number(id);

  const { data: agency, isLoading, isError } = useQuery({
    queryKey: ['agency-public', agencyId],
    queryFn: () => agencyService.getPublicProfile(agencyId),
    enabled: Number.isFinite(agencyId),
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.headerGradient} />
      <PageHeader title={t('Agence')} />

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError || !agency ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={COLORS.gray} />
          <Text style={styles.errorTitle}>{t('Agence introuvable')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {agency.profile_picture ? (
              <Image source={{ uri: agency.profile_picture }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="business" size={36} color={COLORS.secondary} />
              </View>
            )}
            <Text style={styles.agencyName}>{agency.name}</Text>
            {agency.city ? (
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
                <Text style={styles.cityText}>{agency.city}</Text>
              </View>
            ) : null}
            {agency.available_cars_count != null ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>
                  {agency.available_cars_count} {t('véhicule')}{agency.available_cars_count > 1 ? 's' : ''} disponible
                  {agency.available_cars_count > 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {agency.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('À propos')}</Text>
              <Text style={styles.description}>{agency.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Contact')}</Text>
            <InfoRow
              icon="call-outline"
              label={t('Téléphone')}
              value={agency.phone}
              onPress={agency.phone ? () => Linking.openURL(`tel:${agency.phone}`) : undefined}
            />
            <InfoRow
              icon="mail-outline"
              label={t('E-mail')}
              value={agency.email}
              onPress={agency.email ? () => Linking.openURL(`mailto:${agency.email}`) : undefined}
            />
            <InfoRow
              icon="location-outline"
              label={t('Adresse')}
              value={[agency.address, agency.city, agency.postal_code].filter(Boolean).join(', ') || null}
            />
            {agency.responsable_name ? (
              <InfoRow icon="person-outline" label={t('Responsable')} value={agency.responsable_name} />
            ) : null}
            {agency.years_in_business ? (
              <InfoRow
                icon="time-outline"
                label={t('Expérience')}
                value={`${agency.years_in_business} an${agency.years_in_business > 1 ? 's' : ''} d'activité`}
              />
            ) : null}
          </View>
        </ScrollView>
      )}
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
    height: 160,
  },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray },
  scroll: { padding: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  avatarFallback: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  agencyName: { fontSize: 22, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cityText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  badge: {
    marginTop: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 12 },
  description: { fontSize: 14, color: COLORS.gray, lineHeight: 21 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.black, marginTop: 2 },
  infoValueLink: { color: COLORS.primary },
});
