import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { bookingsService } from '@/services/bookings.service';
import { formatMoney } from '@/utils/money';
import { rentalDays } from '@/utils/rental';
import type { Booking } from '@/types';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', text: '#92400E' },
  confirmed: { label: 'Confirmée',  bg: '#D1FAE5', text: '#065F46' },
  completed: { label: 'Terminée',   bg: '#DBEAFE', text: '#1E40AF' },
  cancelled: { label: 'Annulée',    bg: '#FEE2E2', text: '#991B1B' },
};

const FILTERS = [
  { key: '', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AgenceBookingsScreen() {
  const router  = useRouter();
  const [status, setStatus] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agence-bookings', status],
    queryFn:  () => bookingsService.getAll(1, status),
  });

  const bookings = data?.data ?? [];
  const stats = data?.statistics;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="calendar-outline" size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>Planning agence</Text>
          <Text style={styles.heroTitle}>Réservations</Text>
          <Text style={styles.heroSub}>{data?.total ?? 0} demande{(data?.total ?? 0) !== 1 ? 's' : ''} à suivre</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#92400E' }]}>{stats?.pending ?? 0}</Text><Text style={styles.statLabel}>En attente</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#065F46' }]}>{stats?.active ?? 0}</Text><Text style={styles.statLabel}>Confirmées</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#1E40AF' }]}>{stats?.completed ?? 0}</Text><Text style={styles.statLabel}>Terminées</Text></View>
      </View>

      <View style={styles.revenueCard}>
        <View>
          <Text style={styles.revenueLabel}>Revenu agence</Text>
          <Text style={styles.revenueValue}>{formatMoney(stats?.revenue ?? 0)}</Text>
          <Text style={styles.revenueHint}>Locations actives et terminées (toutes pages)</Text>
        </View>
        <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, status === f.key && styles.chipActive]}
            onPress={() => setStatus(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipTxt, status === f.key && styles.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => {
            const s = STATUS[item.status] ?? STATUS.pending;
            const nights = rentalDays(item.start_date, item.end_date);
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/booking/${item.id}` as any)} activeOpacity={0.8}>
                {/* Car */}
                <View style={styles.carRow}>
                  <View style={styles.carIcon}>
                    <Ionicons name="car-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carName}>{item.car.brand} {item.car.model}</Text>
                    <Text style={styles.carYear}>{item.car.year}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeTxt, { color: s.text }]}>{s.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Client + details */}
                <View style={styles.bottomRow}>
                  <View style={styles.clientWrap}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarTxt}>{item.user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.clientName}>{item.user.name}</Text>
                      <Text style={styles.dates}>{fmt(item.start_date)} → {fmt(item.end_date)}{nights > 0 ? ` · ${nights}j` : ''}</Text>
                    </View>
                  </View>
                  <Text style={styles.price}>{formatMoney(item.total_price)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySub}>{status ? 'Aucune avec ce statut' : 'Vos réservations apparaîtront ici'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F2F2F7' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginHorizontal: 16, marginTop: 14, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', marginTop: 3 },
  heroSub: { fontSize: 12, color: '#D6EAF8', marginTop: 4, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, ...SHADOW },
  statVal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginTop: 3 },
  revenueCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D6EAF8', ...SHADOW },
  revenueLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  revenueValue: { fontSize: 18, color: '#111827', fontWeight: '800', marginTop: 3 },
  revenueHint: { fontSize: 10, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  chips:  { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip:   { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTxtActive: { color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 16, paddingBottom: 100 },
  card:   { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#EEF2F7', ...SHADOW },
  carRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  carIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  carName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  carYear: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  badge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:{ fontSize: 11, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0', marginVertical: 10 },
  bottomRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  clientAvatarTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  clientName:   { fontSize: 13, fontWeight: '600', color: '#111827' },
  dates:        { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  price:        { fontSize: 15, fontWeight: '700', color: '#111827' },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySub:     { fontSize: 13, color: '#8E8E93' },
});
