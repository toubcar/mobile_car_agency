import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { reportsService } from '@/services/reports.service';
import { formatMoney } from '@/utils/money';

export default function AgenceReportsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agency-reports'],
    queryFn: () => reportsService.getAgencyOverview(),
  });

  const stats = data?.stats;
  const fleet = data?.fleet;
  const monthly = data?.performance?.monthly_data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.topTitle}>Rapports</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        >
          <View style={styles.grid}>
            <Metric label="Revenus" value={formatMoney(stats?.total_revenue ?? 0)} />
            <Metric label="Locations" value={String(stats?.total_rentals ?? 0)} />
            <Metric label="Actives" value={String(stats?.active_rentals ?? 0)} />
            <Metric label="Véhicules" value={String(stats?.total_cars ?? 0)} />
          </View>

          <Text style={styles.section}>Flotte</Text>
          <View style={styles.card}>
            <Row label="Total" value={fleet?.total_vehicles} />
            <Row label="Disponibles" value={fleet?.available_vehicles} />
            <Row label="En maintenance" value={fleet?.maintenance_vehicles} />
          </View>

          {monthly.length > 0 ? (
            <>
              <Text style={styles.section}>Performance mensuelle</Text>
              {monthly.map((m) => (
                <View key={m.month} style={styles.card}>
                  <Text style={styles.monthTitle}>{m.month}</Text>
                  <Row label="Revenus" value={formatMoney(m.revenue)} />
                  <Row label="Locations" value={m.rentals} />
                  <Row label="Moyenne / location" value={formatMoney(m.average_revenue)} />
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLbl}>{label}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: number | string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLbl}>{label}</Text>
      <Text style={styles.rowVal}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  metricVal: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  metricLbl: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  section: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 8, letterSpacing: 0.5 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEF2F7', gap: 8 },
  monthTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLbl: { fontSize: 13, color: '#6B7280' },
  rowVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
});
