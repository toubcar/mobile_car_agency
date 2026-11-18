import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { COLORS } from '@/constants/api';
import { adminShadow } from '@/constants/adminTheme';
import { formatMoney } from '@/utils/money';
import type { Booking } from '@/types';

import { t, jsLocale } from '@/i18n';

const SHADOW = adminShadow.card;
const MAX_ITEMS = 5;

const STATUS: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  pending:   { get label() { return t('En attente'); },  bg: '#FEF3C7', text: '#92400E', bar: '#F59E0B' },
  confirmed: { get label() { return t('Confirmée'); },   bg: '#D1FAE5', text: '#065F46', bar: '#10B981' },
  completed: { get label() { return t('Terminée'); },    bg: '#DBEAFE', text: '#1E40AF', bar: '#3B82F6' },
  cancelled: { get label() { return t('Annulée'); },     bg: '#FEE2E2', text: '#991B1B', bar: '#EF4444' },
};

type FilterKey = 'all' | 'pending' | 'confirmed' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', get label() { return t('Toutes'); } },
  { key: 'pending', get label() { return t('En attente'); } },
  { key: 'confirmed', get label() { return t('Confirmées'); } },
  { key: 'completed', get label() { return t('Terminées'); } },
];

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const s = new Date(start).toLocaleDateString(jsLocale(), opts);
  const e = new Date(end).toLocaleDateString(jsLocale(), opts);
  return `${s} → ${e}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return t('Il y a :mins min', { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('Il y a :hours h', { hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('Il y a :days j', { days });
  return new Date(iso).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short' });
}

interface Props {
  bookings: Booking[];
  isLoading: boolean;
  onSeeAll: () => void;
  onOpenBooking: (id: number) => void;
}

export default function RecentActivitySection({ bookings, isLoading, onSeeAll, onOpenBooking }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const recent = useMemo(() => bookings.slice(0, MAX_ITEMS), [bookings]);

  const counts = useMemo(() => ({
    all: recent.length,
    pending: recent.filter((b) => b.status === 'pending').length,
    confirmed: recent.filter((b) => b.status === 'confirmed').length,
    completed: recent.filter((b) => b.status === 'completed').length,
  }), [recent]);

  const filtered = useMemo(() => {
    if (filter === 'all') return recent;
    return recent.filter((b) => b.status === filter);
  }, [recent, filter]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Activité récente')}</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>{t('Tout voir')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {/* Mini synthèse */}
        <View style={styles.summaryRow}>
          <SummaryChip label={t('Sur 5 récentes')} value={filtered.length} />
          <SummaryChip label={t('En attente')} value={counts.pending} accent="#B45309" />
          <SummaryChip label={t('Confirmées')} value={counts.confirmed} accent="#059669" />
        </View>

        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = f.key === 'all' ? counts.all : counts[f.key as keyof typeof counts] ?? 0;
            if (f.key !== 'all' && count === 0) return null;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
                {count > 0 ? (
                  <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                    <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste */}
        {isLoading && bookings.length === 0 ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? t('Aucune réservation récente') : t('Aucune réservation pour ce filtre')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((b) => {
              const s = STATUS[b.status] ?? STATUS.pending;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.item}
                  onPress={() => onOpenBooking(b.id)}
                  activeOpacity={0.78}
                >
                  <View style={[styles.statusBar, { backgroundColor: s.bar }]} />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <View style={styles.itemIdentity}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTxt}>
                            {b.user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName} numberOfLines={1}>{b.user.name}</Text>
                          <Text style={styles.carName} numberOfLines={1}>
                            {b.car.brand} {b.car.model}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.price}>{formatMoney(b.total_price)}</Text>
                    </View>
                    <View style={styles.itemBottom}>
                      <Text style={styles.metaText}>{formatRange(b.start_date, b.end_date)}</Text>
                      <View style={styles.itemBottomRight}>
                        <Text style={styles.timeAgo}>{relativeTime(b.created_at)}</Text>
                        <View style={[styles.badge, { backgroundColor: s.bg }]}>
                          <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {bookings.length > MAX_ITEMS ? (
          <TouchableOpacity style={styles.moreBtn} onPress={onSeeAll} activeOpacity={0.8}>
            <Text style={styles.moreText}>+{bookings.length - MAX_ITEMS} {t('autres réservations ›')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function SummaryChip({
  label,
  value,
  accent = COLORS.primary,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <View style={styles.summaryChip}>
      <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  seeAll: { fontSize: 15, fontWeight: '500', color: COLORS.primary },

  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    ...SHADOW,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },

  filterScroll: { gap: 8, paddingBottom: 12 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFF' },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#374151' },
  filterBadgeTextActive: { color: '#FFF' },

  loader: { paddingVertical: 28 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  list: { gap: 10 },
  item: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statusBar: { width: 4 },
  itemBody: { flex: 1, padding: 12, gap: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  itemIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  carName: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  price: { fontSize: 13, fontWeight: '800', color: '#111827' },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: { fontSize: 12, color: '#6B7280' },
  itemBottomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeAgo: { fontSize: 10, color: '#9CA3AF' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  moreText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
