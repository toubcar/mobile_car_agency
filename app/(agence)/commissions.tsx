import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService, type CommissionRow } from '@/services/finance.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Card, Chips, Empty, Loading, Stat, StatRow } from '@/components/backoffice/ui';
import { formatMoney } from '@/utils/money';

import { t, jsLocale } from '@/i18n';

type Status = 'all' | 'completed' | 'cancelled';
type Period = 'month' | 'year' | 'all';

/**
 * ToubCar's commission on each confirmed booking (website: Finance > Commissions): what the customer paid, the
 * commission, the agency's share. A cancelled booking cancels its commission.
 */
export default function AgencyCommissionsScreen() {
  const [status, setStatus] = useState<Status>('all');
  const [period, setPeriod] = useState<Period>('month');

  const query = useInfiniteQuery({
    queryKey: ['agency-commissions', status, period],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => financeService.agencyCommissions({
      page: pageParam,
      status: status === 'all' ? undefined : status,
      period: period === 'all' ? undefined : period,
    }),
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  });

  const stats = query.data?.pages[0]?.statistics;
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Commissions ToubCar')} subtitle={stats ? t('Votre taux : :rate %', { rate: stats.rate.toLocaleString(jsLocale()) }) : undefined} />
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={COLORS.primary} />}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={(
          <View style={styles.header}>
            {stats ? (
              <>
                <StatRow>
                  <Stat label={t('Commission ToubCar ce mois')} value={formatMoney(stats.month_commission)} tone="#B45309" />
                  <Stat label={t('Votre part ce mois')} value={formatMoney(stats.month_share)} tone="#047857" />
                </StatRow>
                <StatRow>
                  <Stat label={t('Réservations confirmées ce mois')} value={stats.month_bookings} />
                  <Stat label={t('Votre taux de commission')} value={`${stats.rate.toLocaleString(jsLocale())} %`} />
                </StatRow>
              </>
            ) : null}
            <Text style={styles.intro}>
              {t('Payé en ligne : ToubCar encaisse le paiement et vous verse votre part. Elle devient disponible pour un virement à la fin de la location.')}
            </Text>
            <Text style={styles.intro}>
              {t('Payé à l\'agence : vous encaissez le client et la commission ToubCar est déduite de votre solde.')}
            </Text>
            <Chips
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'month', label: t('Ce mois') },
                { value: 'year', label: t('Cette année') },
                { value: 'all', label: t('Tout') },
              ]}
            />
            <Chips
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: t('Toutes') },
                { value: 'completed', label: t('Prélevée') },
                { value: 'cancelled', label: t('Annulée') },
              ]}
            />
          </View>
        )}
        ListEmptyComponent={query.isLoading ? <Loading /> : <Empty text={t('Aucune commission pour le moment : elles apparaissent ici dès qu\'une réservation est confirmée.')} icon="pie-chart-outline" />}
        ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
        renderItem={({ item }) => <CommissionCard row={item} />}
      />
    </SafeAreaView>
  );
}

function CommissionCard({ row }: { row: CommissionRow }) {
  const cancelled = row.status === 'cancelled';
  return (
    <Card style={[styles.card, cancelled && styles.cancelled]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{t('Réservation #:id', { id: row.rental_id ?? '—' })}</Text>
        <Badge label={row.status_label ?? row.status} color={cancelled ? '#6B7280' : '#B45309'} bg={cancelled ? '#F3F4F6' : '#FFFBEB'} />
      </View>
      <Text style={styles.meta} numberOfLines={2}>{[row.customer, row.car, row.date].filter(Boolean).join(' · ')}</Text>
      <View style={styles.amounts}>
        <Amount label={t('Payé par le client')} value={formatMoney(row.total_price, { decimals: 2 })} />
        <Amount label={t('Commission ToubCar') + ` (${row.commission_rate.toLocaleString(jsLocale())} %)`} value={formatMoney(row.commission_amount, { decimals: 2 })} tone="#B45309" />
        <Amount label={t('Votre part')} value={formatMoney(row.agency_amount, { decimals: 2 })} tone="#047857" />
      </View>
      {row.payment_mode_label ? <Text style={styles.mode}>{row.payment_mode_label}</Text> : null}
    </Card>
  );
}

function Amount({ label, value, tone = '#111827' }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.amount}>
      <Text style={styles.amountLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.amountValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  header: { gap: 10, marginBottom: 4 },
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 8 },
  cancelled: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  amounts: { flexDirection: 'row', gap: 8 },
  amount: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 8, gap: 2 },
  amountLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  amountValue: { fontSize: 13, fontWeight: '800' },
  mode: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
});
