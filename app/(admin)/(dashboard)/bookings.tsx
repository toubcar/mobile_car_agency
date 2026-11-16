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

import { t, jsLocale } from '@/i18n';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

const STATUS: Record<string, { label: string; bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending:   { get label() { return t('En attente'); },  bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  confirmed: { get label() { return t('Confirmée'); },   bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle-outline' },
  completed: { get label() { return t('Terminée'); },    bg: '#DBEAFE', text: '#1E40AF', icon: 'checkmark-done-outline' },
  cancelled: { get label() { return t('Annulée'); },     bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
};

const FILTERS = [
  { key: '',           get label() { return t('Toutes'); } },
  { key: 'pending',    get label() { return t('En attente'); } },
  { key: 'confirmed',  get label() { return t('Confirmées'); } },
  { key: 'completed',  get label() { return t('Terminées'); } },
  { key: 'cancelled',  get label() { return t('Annulées'); } },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString(jsLocale(), { day: '2-digit', month: 'short' });
}

export default function AdminBookingsScreen() {
  const router  = useRouter();
  const [status, setStatus] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', status],
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
          <Text style={styles.heroKicker}>{t('Back-office administrateur')}</Text>
          <Text style={styles.heroTitle}>{t('Réservations')}</Text>
          <Text style={styles.heroSub}>{data?.total ?? 0} {t('demandes synchronisées avec Laravel')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#92400E' }]}>{stats?.pending ?? 0}</Text><Text style={styles.statLabel}>{t('En attente')}</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#065F46' }]}>{stats?.active ?? 0}</Text><Text style={styles.statLabel}>{t('Confirmées')}</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#1E40AF' }]}>{stats?.completed ?? 0}</Text><Text style={styles.statLabel}>{t('Terminées')}</Text></View>
      </View>

      <View style={styles.revenueCard}>
        <View>
          <Text style={styles.revenueLabel}>{t('Revenu plateforme')}</Text>
          <Text style={styles.revenueValue}>{formatMoney(stats?.revenue ?? 0)}</Text>
          <Text style={styles.revenueHint}>{t('Locations actives et terminées (toutes pages)')}</Text>
        </View>
        <Ionicons name="trending-up-outline" size={22} color={COLORS.primary} />
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
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{item.user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{item.user.name}</Text>
                    <Text style={styles.carName}>{item.car.brand} {item.car.model}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon} size={11} color={s.text} />
                    <Text style={[styles.badgeTxt, { color: s.text }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.cardBottom}>
                  <View style={styles.dates}>
                    <Ionicons name="calendar-outline" size={12} color="#8E8E93" />
                    <Text style={styles.datesText}>{fmt(item.start_date)} → {fmt(item.end_date)}{nights > 0 ? ` · ${nights}j` : ''}</Text>
                  </View>
                  <Text style={styles.price}>{formatMoney(item.total_price)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t('Aucune réservation')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
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
  chips:    { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chip:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTxtActive: { color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 16, paddingBottom: 100 },
  card:   { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#EEF2F7', ...SHADOW },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  cardInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  carName:  { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  divider:  { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0', marginVertical: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dates:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  datesText:{ fontSize: 12, color: '#8E8E93' },
  price:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  empty:    { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
