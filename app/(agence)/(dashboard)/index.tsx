import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { dashboardService, type DashboardStats } from '@/services/dashboard.service';
import { formatMoney, formatMoneyCompact, percentOf } from '@/utils/money';
import type { Booking } from '@/types';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', text: '#92400E' },
  confirmed: { label: 'Confirmée',  bg: '#D1FAE5', text: '#065F46' },
  completed: { label: 'Terminée',   bg: '#DBEAFE', text: '#1E40AF' },
  cancelled: { label: 'Annulée',    bg: '#FEE2E2', text: '#991B1B' },
};

export default function AgenceDashboard() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['agence-stats'],
    queryFn:  dashboardService.getAgenceStats,
  });
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = useQuery<Booking[]>({
    queryKey: ['agence-recent'],
    queryFn:  dashboardService.getAgenceRecentBookings,
  });
  const recentBookings = recent ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={statsLoading || recentLoading}
            onRefresh={() => { refetchStats(); refetchRecent(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="business-outline" size={13} color={COLORS.secondary} />
            <Text style={styles.badgeTxt}>Agence</Text>
          </View>
        </View>

        {/* KPI cards */}
        {statsLoading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.primary} /></View>
        ) : (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#EBF5FB' }]}>
                <Ionicons name="car-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.kpiVal}>{stats?.total_cars ?? 0}</Text>
              <Text style={styles.kpiLabel}>Véhicules</Text>
              <Text style={styles.kpiSub}>{stats?.available_cars ?? 0} dispo. · {percentOf(stats?.available_cars ?? 0, stats?.total_cars ?? 0)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.kpiVal}>{stats?.total_bookings ?? 0}</Text>
              <Text style={styles.kpiLabel}>Réservations</Text>
              <Text style={styles.kpiSub}>{stats?.active_bookings ?? 0} en cours</Text>
            </View>
          </View>
        )}

        {/* Revenue card */}
        <View style={styles.revCard}>
          <View style={styles.revLeft}>
            <Text style={styles.revLabel}>Revenus ce mois</Text>
            <Text style={styles.revVal}>{formatMoneyCompact(stats?.revenue_this_month ?? 0)} DH</Text>
          </View>
          <View style={styles.revRight}>
            <View style={styles.revTotal}>
              <Text style={styles.revTotalLabel}>Total</Text>
              <Text style={styles.revTotalVal}>{formatMoney(stats?.total_revenue ?? 0)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.actionsRow}>
          {[
            { icon: 'car-outline' as const, label: 'Mes véhicules', route: '/(agence)/cars' },
            { icon: 'calendar-outline' as const, label: 'Réservations', route: '/(agence)/bookings' },
            { icon: 'chatbubbles-outline' as const, label: 'Messages', route: '/(agence)/messages' },
            { icon: 'business-outline' as const, label: 'Profil agence', route: '/(agence)/agency-profile' },
            { icon: 'bar-chart-outline' as const, label: 'Rapports', route: '/(agence)/reports' },
            { icon: 'wallet-outline' as const, label: 'Paiements', route: '/(agence)/finance' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} onPress={() => router.push(a.route as any)} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent bookings */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Dernières réservations</Text>
          <TouchableOpacity onPress={() => router.push('/(agence)/bookings')} activeOpacity={0.7}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recentLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
        ) : recentBookings.length ? (
          <View style={styles.bookingList}>
            {recentBookings.map((b, i) => {
              const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bookingRow, i < recentBookings.length - 1 && styles.bookingBorder]}
                  onPress={() => router.push(`/booking/${b.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingAvatar}>
                    <Text style={styles.bookingAvatarTxt}>{b.user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingUser}>{b.user.name}</Text>
                    <Text style={styles.bookingCar}>{b.car.brand} {b.car.model}</Text>
                  </View>
                  <View>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusTxt, { color: s.text }]}>{s.label}</Text>
                    </View>
                    <Text style={styles.bookingPrice}>{formatMoney(b.total_price)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTxt}>Aucune réservation récente</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EBF5FB', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  badgeTxt:    { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  loadingWrap: { height: 120, justifyContent: 'center', alignItems: 'center' },

  kpiRow:  { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, ...SHADOW },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiVal:  { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 2 },
  kpiLabel:{ fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  kpiSub:  { fontSize: 11, color: '#C7C7CC', marginTop: 4 },

  revCard:  { marginHorizontal: 16, marginBottom: 22, backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
  revLeft:  {},
  revLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  revVal:   { fontSize: 24, fontWeight: '700', color: '#FFF' },
  revRight: {},
  revTotal: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, alignItems: 'center' },
  revTotalLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  revTotalVal:   { fontSize: 15, fontWeight: '700', color: '#FFF' },

  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginBottom: 10 },
  seeAll:       { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 22 },
  actionBtn:  { flex: 1, backgroundColor: '#FFF', borderRadius: 14, alignItems: 'center', paddingVertical: 14, gap: 8, ...SHADOW },
  actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },

  bookingList:   { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', ...SHADOW },
  bookingRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  bookingBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0' },
  bookingAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  bookingAvatarTxt: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  bookingUser:   { fontSize: 14, fontWeight: '600', color: '#111827' },
  bookingCar:    { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginBottom: 3 },
  statusTxt:     { fontSize: 10, fontWeight: '700' },
  bookingPrice:  { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'right' },

  empty:    { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyTxt: { fontSize: 13, color: '#8E8E93' },
});
