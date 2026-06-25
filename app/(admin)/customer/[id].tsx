import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { customersService } from '@/services/customers.service';
import { formatMoney } from '@/utils/money';

export default function AdminCustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const customerId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersService.get(customerId),
    enabled: Number.isFinite(customerId),
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const rentals = (data.rentals as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.topTitle}>Client</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.sub}>{data.email ?? '—'}</Text>
          {data.phone ? <Text style={styles.sub}>{data.phone}</Text> : null}
        </View>

        <View style={styles.grid}>
          <Metric label="Locations" value={String(data.total_rentals)} />
          <Metric label="Dépenses" value={formatMoney(data.total_spent)} />
          <Metric label="Fidélité" value={data.loyalty_status} />
          <Metric label="Ville" value={data.city ?? '—'} />
        </View>

        <Text style={styles.section}>Historique locations</Text>
        {rentals.length === 0 ? (
          <Text style={styles.empty}>Aucune location enregistrée.</Text>
        ) : (
          rentals.map((r, i) => (
            <View key={i} style={styles.rental}>
              <Text style={styles.rentalTitle}>
                #{String(r.id ?? i)} · {String(r.status ?? '—')}
              </Text>
              <Text style={styles.rentalSub}>
                {String(r.start_date ?? '—')} → {String(r.end_date ?? '—')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricVal} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metric: { width: '47%', backgroundColor: '#FFF', borderRadius: 12, padding: 12 },
  metricVal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  metricLbl: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  section: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' },
  rental: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8 },
  rentalTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rentalSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  empty: { color: '#9CA3AF', fontSize: 14 },
});
