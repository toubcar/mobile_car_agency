import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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

function firstNameOnly(full?: string | null): string | null {
  const trimmed = full?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

function formatAddress(agency: {
  address?: string | null;
  quartier?: string | null;
  city?: string | null;
  postal_code?: string | null;
}): string | null {
  const line = [agency.address, agency.quartier, agency.city, agency.postal_code]
    .filter(Boolean)
    .join(', ');
  return line || null;
}

export default function AgencyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agencyId = Number(id);

  const { data: agency, isLoading, isError } = useQuery({
    queryKey: ['agency-public', agencyId],
    queryFn: () => agencyService.getPublicProfile(agencyId),
    enabled: Number.isFinite(agencyId),
  });

  const prenom =
    firstNameOnly(agency?.responsable_name) ?? firstNameOnly(agency?.name) ?? agency?.name ?? null;
  const adresse = agency ? formatAddress(agency) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.headerGradient} />
      <PageHeader title="Agence" />

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError || !agency ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={COLORS.gray} />
          <Text style={styles.errorTitle}>Agence introuvable</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {agency.profile_picture ? (
              <Image source={{ uri: agency.profile_picture }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person-outline" size={36} color={COLORS.secondary} />
              </View>
            )}
            {prenom ? <Text style={styles.prenom}>{prenom}</Text> : null}
            {adresse ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.addressText}>{adresse}</Text>
              </View>
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
  prenom: { fontSize: 22, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
});
