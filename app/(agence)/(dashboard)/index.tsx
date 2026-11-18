import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, COLORS, APP_NAME } from '@/constants/api';
import { describeApiError, isSessionExpiredError } from '@/utils/apiError';
import { ADMIN_BG, adminShadow } from '@/constants/adminTheme';
import { dashboardService, type DashboardStats } from '@/services/dashboard.service';
import AgenceMenuDrawer from '@/components/agence/AgenceMenuDrawer';
import RecentActivitySection from '@/components/admin/RecentActivitySection';
import { formatMoney, formatMoneyCompact, percentOf } from '@/utils/money';
import type { Booking } from '@/types';

import { t, jsLocale } from '@/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
const GRID_PAD = 16;
const MODULE_W = (SCREEN_W - GRID_PAD * 2 - CARD_GAP) / 2;
const SHADOW = adminShadow.card;
const FIXED_HEADER_H = 48;

function formatDateFr(): string {
  return new Date().toLocaleDateString(jsLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function HeroMetric({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.heroMetric}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.7)" />
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
  wide,
  onPress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  wide?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={[styles.kpiLabel, { color: accent, marginBottom: 6 }]}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.kpiTile, wide && styles.kpiTileWide]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.kpiTile, wide && styles.kpiTileWide]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </TouchableOpacity>
  );
}

function UtilizationBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const pct = percentOf(current, total);
  return (
    <View style={styles.utilRow}>
      <View style={styles.utilHead}>
        <Text style={styles.utilLabel}>{label}</Text>
        <Text style={styles.utilPct}>{pct}%</Text>
      </View>
      <View style={styles.utilTrack}>
        <View style={[styles.utilFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.utilSub}>{current} / {total}</Text>
    </View>
  );
}

export default function AgenceDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const fixedHeaderOffset = insets.top + FIXED_HEADER_H;

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErr,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['agence-stats'],
    queryFn: dashboardService.getAgenceStats,
  });

  const {
    data: recent,
    isLoading: recentLoading,
    isError: recentError,
    error: recentErr,
    refetch: refetchRecent,
  } = useQuery<Booking[]>({
    queryKey: ['agence-recent'],
    queryFn: dashboardService.getAgenceRecentBookings,
  });

  const loadError = statsError || recentError;
  const firstErr = statsErr ?? recentErr;
  const loadErrorHint = describeApiError(firstErr);
  const showLoadError = loadError && !isSessionExpiredError(firstErr);
  const refreshing = statsLoading || recentLoading;
  const recentBookings: Booking[] = recent ?? [];

  const handleErrorBannerPress = () => {
    refetchStats();
    refetchRecent();
  };

  return (
    <View style={styles.root}>
      <AgenceMenuDrawer visible={showMenu} onClose={() => setShowMenu(false)} />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]} pointerEvents="box-none">
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Ouvrir le menu')}
          >
            <Ionicons name="menu" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroBrandBlock}>
            <Text style={styles.heroBrand}>{APP_NAME}</Text>
            <Text style={styles.heroDate}>{formatDateFr()}</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => router.push('/(agence)/profile')}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('Mon agence')}
            >
              <Ionicons name="business-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { refetchStats(); refetchRecent(); }}
            tintColor="#FFF"
            progressViewOffset={fixedHeaderOffset}
          />
        }
      >
        <LinearGradient
          colors={['#0B1628', '#1D3557', '#234A6E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroOrb1} pointerEvents="none" />
          <View style={styles.heroOrb2} pointerEvents="none" />

          <View style={[styles.heroContent, { paddingTop: fixedHeaderOffset }]}>
            <View style={styles.heroBadge}>
              <Ionicons name="business-outline" size={13} color="#AED6F1" />
              <Text style={styles.heroBadgeText}>{t('Partenaire agence')}</Text>
            </View>

            {statsLoading && !stats ? (
              <ActivityIndicator color="#FFF" style={{ marginTop: 24, marginBottom: 8 }} />
            ) : (
              <View style={styles.heroMetrics}>
                <HeroMetric
                  icon="wallet-outline"
                  label={t('Ce mois')}
                  value={`${formatMoneyCompact(stats?.revenue_this_month ?? 0)} DH`}
                />
                <View style={styles.heroDivider} />
                <HeroMetric
                  icon="calendar-outline"
                  label={t('Actives')}
                  value={String(stats?.active_bookings ?? 0)}
                />
                <View style={styles.heroDivider} />
                <HeroMetric
                  icon="car-outline"
                  label={t('Véhicules')}
                  value={String(stats?.total_cars ?? 0)}
                />
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.floatingRev}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.floatingRevInner}>
            <View style={styles.revLeft}>
              <Text style={styles.revEyebrow}>{t('Revenu total agence')}</Text>
              {statsLoading && !stats ? (
                <ActivityIndicator color={COLORS.primary} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
              ) : (
                <Text style={styles.revAmount}>{formatMoney(stats?.total_revenue ?? 0)}</Text>
              )}
              <View style={styles.revChip}>
                <Ionicons name="trending-up" size={12} color="#059669" />
                <Text style={styles.revChipText}>
                  {stats?.available_cars ?? 0} {t('véhicule')}{(stats?.available_cars ?? 0) !== 1 ? 's' : ''} disponible{(stats?.available_cars ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.revRing}>
              <Text style={styles.revRingPct}>
                {percentOf(stats?.available_cars ?? 0, stats?.total_cars ?? 0)}%
              </Text>
              <Text style={styles.revRingLabel}>{t('Dispo.')}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.body}>
          {showLoadError && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={handleErrorBannerPress}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-offline-outline" size={22} color="#B45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>{t('Connexion API interrompue')}</Text>
                <Text style={styles.errorSub}>
                  {loadErrorHint}
                  {'\n'}
                  {API_BASE_URL}
                </Text>
              </View>
              <Ionicons name="refresh" size={18} color="#B45309" />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>{t("Vue d'ensemble")}</Text>
          {statsLoading && !stats ? (
            <View style={styles.loadingBox}><ActivityIndicator color={COLORS.primary} /></View>
          ) : (
            <>
              <View style={styles.kpiGrid}>
                <KpiTile
                  label={t('Véhicules')}
                  value={stats?.total_cars ?? 0}
                  sub={`${stats?.available_cars ?? 0} disponibles`}
                  accent="#1D3557"
                  onPress={() => router.push('/(agence)/cars')}
                />
                <KpiTile
                  label={t('Réservations')}
                  value={stats?.total_bookings ?? 0}
                  sub={`${stats?.active_bookings ?? 0} en cours`}
                  accent="#D97706"
                  onPress={() => router.push('/(agence)/bookings')}
                />
                <KpiTile
                  label={t('Mois en cours')}
                  value={formatMoneyCompact(stats?.revenue_this_month ?? 0)}
                  sub={t('DH (mois en cours)')}
                  accent="#4F46E5"
                  onPress={() => router.push('/(agence)/reports')}
                />
              </View>

              <View style={styles.utilCard}>
                <Text style={styles.utilCardTitle}>{t("Taux d'utilisation")}</Text>
                <UtilizationBar label={t('Parc disponible')} current={stats?.available_cars ?? 0} total={stats?.total_cars ?? 0} color="#1D3557" />
                <UtilizationBar label={t('Réservations actives')} current={stats?.active_bookings ?? 0} total={stats?.total_bookings ?? 0} color="#D97706" />
              </View>
            </>
          )}

          <RecentActivitySection
            bookings={recentBookings}
            isLoading={recentLoading}
            onSeeAll={() => router.push('/(agence)/bookings')}
            onOpenBooking={(id) => router.push(`/booking/${id}` as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { paddingBottom: 40 },

  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(11, 22, 40, 0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  hero: {
    paddingBottom: 56,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: { zIndex: 2 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: FIXED_HEADER_H,
    zIndex: 3,
  },
  heroBrandBlock: { flex: 1 },
  heroBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(174,214,241,0.9)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#AED6F1' },
  heroMetrics: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroMetric: { flex: 1, alignItems: 'center', gap: 4 },
  heroMetricValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  heroMetricLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  heroOrb1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(174,214,241,0.08)',
    top: -40,
    right: -50,
  },
  heroOrb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 20,
    left: -30,
  },

  floatingRev: {
    marginTop: -36,
    marginHorizontal: 16,
    zIndex: 2,
    ...SHADOW,
  },
  floatingRevInner: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  revLeft: { flex: 1 },
  revEyebrow: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  revAmount: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginTop: 4 },
  revChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  revChipText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  revRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  revRingPct: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  revRingLabel: { fontSize: 9, fontWeight: '700', color: '#6B7280', marginTop: 1 },

  body: { paddingTop: 20 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  errorSub: { fontSize: 11, color: '#B45309', marginTop: 2 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 16,
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: -0.2,
  },

  loadingBox: { height: 80, justifyContent: 'center', alignItems: 'center' },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
    marginBottom: 12,
  },
  kpiTile: {
    width: MODULE_W,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    ...SHADOW,
  },
  kpiTileWide: { width: '100%' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  kpiLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  utilCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    ...SHADOW,
  },
  utilCardTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 14 },
  utilRow: { marginBottom: 14 },
  utilHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  utilLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  utilPct: { fontSize: 12, fontWeight: '800', color: '#111827' },
  utilTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  utilFill: { height: '100%', borderRadius: 3 },
  utilSub: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
});
