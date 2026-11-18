import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService, type AdminCommissionOverview } from '@/services/finance.service';
import { agenciesService } from '@/services/agencies.service';
import { exportsService } from '@/services/exports.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Chips, Empty, Field, Loading, SectionLabel, Sheet, Stat, StatRow } from '@/components/backoffice/ui';
import { formatMoney } from '@/utils/money';
import { serverMessage } from '@/utils/apiError';
import { openInBrowser } from '@/utils/openLink';
import { toIsoDate } from '@/utils/dates';

import { t, jsLocale } from '@/i18n';

type Period = 'month' | 'last_month' | 'year';
type AgencyRow = AdminCommissionOverview['agencies'][number];

function periodRange(period: Period): { start_date: string; end_date: string } {
  const now = new Date();
  if (period === 'year') return { start_date: `${now.getFullYear()}-01-01`, end_date: `${now.getFullYear()}-12-31` };
  const month = period === 'last_month' ? new Date(now.getFullYear(), now.getMonth() - 1, 1, 12) : new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  return { start_date: toIsoDate(month), end_date: toIsoDate(last) };
}

/**
 * ToubCar's commissions (website: Finance > Commissions): what each confirmed booking brought, each agency's rate
 * (added to its prices for its customers) and the CSV export. A cancelled booking cancels its commission.
 */
export default function AdminCommissionsScreen() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('month');
  const [editing, setEditing] = useState<AgencyRow | null>(null);
  const [rate, setRate] = useState('');
  const range = useMemo(() => periodRange(period), [period]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-commissions', range.start_date, range.end_date],
    queryFn: () => financeService.adminCommissions(range),
  });

  const saveRate = useMutation({
    mutationFn: () => agenciesService.updateCommission(editing!.id, Number(rate.replace(',', '.'))),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
      Alert.alert(t('Taux mis à jour'), t('Ce taux est ajouté aux prix de l\'agence : c\'est le prix que voient ses clients. Il s\'applique aux prochaines réservations.'));
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.'))),
  });

  const exportCsv = useMutation({
    mutationFn: () => exportsService.adminLink('commissions', { date_from: range.start_date, date_to: range.end_date }),
    onSuccess: (url) => void openInBrowser(url),
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('L\'export n\'a pas pu être préparé.'))),
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Commissions ToubCar')} subtitle={t('Taux par agence et commissions perçues')} />
      {isLoading || !data ? <Loading /> : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        >
          <Chips
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'month', label: t('Ce mois') },
              { value: 'last_month', label: t('Mois précédent') },
              { value: 'year', label: t('Cette année') },
            ]}
          />
          <StatRow>
            <Stat label={t('Commissions de la période')} value={formatMoney(data.summary.total_commission)} tone="#047857" />
            <Stat label={t('Réservations confirmées')} value={data.summary.total_transactions} />
          </StatRow>
          <StatRow>
            <Stat label={t('Aujourd\'hui')} value={formatMoney(data.statistics.today_commission ?? 0)} />
            <Stat label={t('Depuis le début')} value={formatMoney(data.statistics.total_admin_commission ?? 0)} />
          </StatRow>
          <Button label={t('Exporter (CSV)')} icon="download-outline" variant="secondary" onPress={() => exportCsv.mutate()} loading={exportCsv.isPending} />

          <SectionLabel>{t('Taux par agence')}</SectionLabel>
          <Text style={styles.intro}>{t('Taux par défaut des nouvelles agences : :rate %', { rate: (data.statistics.commission_rate ?? 10).toLocaleString(jsLocale()) })}</Text>
          {data.agencies.length ? data.agencies.map((agency) => (
            <Card key={agency.id} style={styles.agency}>
              <View style={{ flex: 1 }}>
                <Text style={styles.agencyName}>{agency.name}</Text>
                <Text style={styles.meta}>
                  {[agency.city, t(':count réservation(s)', { count: agency.period_bookings }), formatMoney(agency.period_commission)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Badge label={`${agency.commission_rate.toLocaleString(jsLocale())} %`} color={COLORS.primary} bg="#EFF6FF" />
              <Button label={t('Modifier')} variant="ghost" onPress={() => { setRate(String(agency.commission_rate)); setEditing(agency); }} style={styles.edit} />
            </Card>
          )) : <Empty text={t('Aucune agence approuvée.')} icon="business-outline" />}

          <SectionLabel>{t('Dernières commissions')}</SectionLabel>
          {data.transactions.length ? data.transactions.map((row) => (
            <Card key={row.id} style={[styles.row, row.status === 'cancelled' && { opacity: 0.6 }]}>
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle} numberOfLines={1}>{row.agency_name ?? '—'} · #{row.rental_id}</Text>
                <Text style={styles.rowAmount}>{formatMoney(row.commission_amount, { decimals: 2 })}</Text>
              </View>
              <Text style={styles.meta} numberOfLines={2}>
                {[row.car, row.customer, row.date].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.meta}>
                {t('Payé par le client')} : {formatMoney(row.total_price, { decimals: 2 })} · {row.commission_rate.toLocaleString(jsLocale())} % · {row.status_label}
              </Text>
            </Card>
          )) : <Empty text={t('Aucune commission sur cette période.')} icon="pie-chart-outline" />}
        </ScrollView>
      )}

      <Sheet
        visible={editing !== null}
        title={t('Commission de :agency', { agency: editing?.name ?? '' })}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={() => saveRate.mutate()} loading={saveRate.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        <Field
          label={t('Taux de commission (%)')}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          hint={t('Ce taux est ajouté aux prix de l\'agence : c\'est le prix que voient ses clients. Il s\'applique aux prochaines réservations.')}
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48, gap: 10 },
  intro: { fontSize: 12, color: '#6B7280', marginHorizontal: 4 },
  agency: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agencyName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  edit: { paddingVertical: 8, paddingHorizontal: 10 },
  row: { gap: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  rowAmount: { fontSize: 14, fontWeight: '800', color: '#047857' },
});
