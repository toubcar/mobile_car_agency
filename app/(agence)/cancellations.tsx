import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { marketingService } from '@/services/marketing.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG, adminShadow } from '@/constants/adminTheme';

export default function AgenceCancellationsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cancellation-stats'],
    queryFn: () => marketingService.getCancellationStats(),
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title="Annulations" subtitle="Quota & statut du compte" />

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        >
          {data?.is_suspended ? (
            <View style={styles.warn}>
              <Ionicons name="warning-outline" size={22} color="#991B1B" />
              <Text style={styles.warnTxt}>Compte suspendu pour excès d’annulations.</Text>
            </View>
          ) : null}

          {data?.warning_message ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTxt}>{data.warning_message}</Text>
            </View>
          ) : null}

          <View style={styles.grid}>
            <Card label="Annulations" value={String(data?.cancellation_count ?? 0)} />
            <Card label="Maximum" value={String(data?.max_cancellations ?? 0)} />
            <Card label="Restantes" value={String(data?.remaining_cancellations ?? 0)} highlight />
          </View>

          {data?.last_cancellation ? (
            <Text style={styles.last}>Dernière annulation : {new Date(data.last_cancellation).toLocaleString('fr-FR')}</Text>
          ) : null}

          <TouchableOpacity style={styles.btn} onPress={() => router.push('/(agence)/bookings')}>
            <Text style={styles.btnTxt}>Voir les réservations</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <Text style={[styles.cardVal, highlight && styles.cardValHighlight]}>{value}</Text>
      <Text style={styles.cardLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 16, paddingBottom: 40 },
  warn: { flexDirection: 'row', gap: 10, backgroundColor: '#FEE2E2', padding: 14, borderRadius: 12, marginBottom: 12 },
  warnTxt: { flex: 1, color: '#991B1B', fontWeight: '600', fontSize: 13 },
  notice: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginBottom: 12 },
  noticeTxt: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card: { width: '30%', flexGrow: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', ...adminShadow.card },
  cardHighlight: { borderWidth: 2, borderColor: COLORS.primary },
  cardVal: { fontSize: 22, fontWeight: '800', color: '#111827' },
  cardValHighlight: { color: COLORS.primary },
  cardLbl: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  last: { fontSize: 12, color: '#6B7280', marginBottom: 20 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  btnTxt: { color: '#FFF', fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnOutlineTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
