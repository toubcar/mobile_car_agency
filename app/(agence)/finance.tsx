import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService, type AgencyFinanceTransaction } from '@/services/finance.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Empty, Field, Loading, SectionLabel, Sheet, Stat, StatRow } from '@/components/backoffice/ui';
import { formatMoney } from '@/utils/money';
import { serverMessage } from '@/utils/apiError';

import { t, jsLocale, dirIcon } from '@/i18n';

const STATUS_LOOK: Record<string, { color: string; bg: string }> = {
  completed: { color: '#047857', bg: '#ECFDF5' },
  pending: { color: '#B45309', bg: '#FFFBEB' },
  failed: { color: '#B91C1C', bg: '#FEF2F2' },
  cancelled: { color: '#6B7280', bg: '#F3F4F6' },
};

/**
 * The agency's money, as on the website's Finance page: what it can be paid now, what its bookings in progress will
 * bring, this month's share, its commission rate, the latest movements and its payout requests.
 */
export default function AgenceFinanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [rib, setRib] = useState('');
  const [holder, setHolder] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agency-finance'],
    queryFn: () => financeService.agencyOverview(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      financeService.requestPayment({
        amount: Number(amount.replace(',', '.')),
        bank_name: bankName.trim(),
        rib_number: rib.trim(),
        account_holder: holder.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setRequestOpen(false);
      setAmount('');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['agency-finance'] });
      Alert.alert(t('Demande envoyée'), t('Votre demande de virement a été transmise.'));
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Vérifiez le montant et les coordonnées bancaires.'))),
  });

  const submit = () => {
    if (!Number(amount.replace(',', '.')) || !bankName.trim() || !rib.trim() || !holder.trim()) {
      Alert.alert(t('Champs requis'), t('Montant, banque, RIB et titulaire sont obligatoires.'));
      return;
    }
    mutation.mutate();
  };

  const o = data?.overview;
  const balance = o?.current_balance ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Finance')} subtitle={t('Vos gains et vos virements')} />

      {isLoading || !o ? <Loading /> : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        >
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t('Solde disponible')}</Text>
            <Text style={[styles.balance, balance < 0 && { color: '#B91C1C' }]}>{formatMoney(balance, { decimals: 2 })}</Text>
            <Text style={styles.balanceHint}>
              {balance < 0
                ? t('Commission due à ToubCar')
                : t('Peut être viré sur votre compte')}
            </Text>
            <Button
              label={t('Demande de virement')}
              icon="cash-outline"
              onPress={() => setRequestOpen(true)}
              disabled={balance < 100}
              style={{ marginTop: 12 }}
            />
            {balance < 100 ? <Text style={styles.minHint}>{t('Un virement se demande à partir de 100 DH.')}</Text> : null}
          </Card>

          <StatRow>
            <Stat label={t('Gains à venir')} value={formatMoney(o.upcoming_earnings)} tone="#1D4ED8" />
            <Stat label={t('Virements en cours')} value={formatMoney(o.pending_earnings)} tone="#B45309" />
          </StatRow>
          <StatRow>
            <Stat label={t('Votre part ce mois')} value={formatMoney(o.monthly_revenue)} />
            <Stat label={t('Gains totaux')} value={formatMoney(o.total_earnings)} tone="#047857" />
          </StatRow>
          <Text style={styles.growth}>
            {t('Évolution sur le mois précédent : :growth %', { growth: o.revenue_growth.toLocaleString(jsLocale()) })}
          </Text>

          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(agence)/commissions' as never)}>
            <Card style={styles.rateCard}>
              <View style={styles.rateHead}>
                <Ionicons name="pie-chart-outline" size={20} color={COLORS.primary} />
                <Text style={styles.rateTitle}>{t('Votre taux de commission')}</Text>
                <Text style={styles.rateValue}>{o.commission_rate.toLocaleString(jsLocale())} %</Text>
              </View>
              <Text style={styles.rateText}>
                {t('Vos clients voient vos prix avec la commission de :rate % incluse : vous recevez exactement le prix que vous avez fixé.', { rate: o.commission_rate.toLocaleString(jsLocale()) })}
              </Text>
              <View style={styles.rateLink}>
                <Text style={styles.rateLinkText}>{t('Commissions ToubCar')}</Text>
                <Ionicons name={dirIcon('chevron-forward')} size={16} color={COLORS.primary} />
              </View>
            </Card>
          </TouchableOpacity>

          <SectionLabel>{t('Demandes de virement')}</SectionLabel>
          {data.payout_requests.length ? (
            <Card style={styles.list}>
              {data.payout_requests.map((row, i) => <TransactionRow key={row.id} row={row} first={i === 0} payout />)}
            </Card>
          ) : <Empty text={t('Aucune demande de virement pour le moment.')} icon="cash-outline" />}

          <SectionLabel>{t('Dernières opérations')}</SectionLabel>
          {data.transactions.length ? (
            <Card style={styles.list}>
              {data.transactions.map((row, i) => <TransactionRow key={row.id} row={row} first={i === 0} />)}
            </Card>
          ) : <Empty text={t('Aucune opération pour le moment.')} icon="swap-vertical-outline" />}
        </ScrollView>
      )}

      <Sheet
        visible={requestOpen}
        title={t('Demande de virement')}
        onClose={() => setRequestOpen(false)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setRequestOpen(false)} style={{ flex: 1 }} />
            <Button label={t('Envoyer la demande')} onPress={submit} loading={mutation.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        <Text style={styles.sheetIntro}>
          {t('Disponible : :amount. ToubCar vire le montant demandé sur votre compte bancaire.', { amount: formatMoney(balance, { decimals: 2 }) })}
        </Text>
        <Field label={t('Montant (DH)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="1000" />
        <Field label={t('Nom de la banque')} value={bankName} onChangeText={setBankName} />
        <Field label={t('RIB / compte bancaire')} value={rib} onChangeText={setRib} autoCapitalize="characters" />
        <Field label={t('Titulaire du compte')} value={holder} onChangeText={setHolder} />
        <Field label={t('Note (optionnel)')} value={notes} onChangeText={setNotes} multiline />
      </Sheet>
    </SafeAreaView>
  );
}

function TransactionRow({ row, first, payout }: { row: AgencyFinanceTransaction; first: boolean; payout?: boolean }) {
  const look = STATUS_LOOK[row.status] ?? STATUS_LOOK.cancelled;
  // a payout leaves the balance: shown as money out, whatever the sign stored
  const out = payout || !row.is_income;
  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: out ? '#FEF2F2' : '#ECFDF5' }]}>
        <Ionicons name={out ? 'arrow-up' : 'arrow-down'} size={16} color={out ? '#B91C1C' : '#047857'} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{row.description}</Text>
        <Text style={styles.rowMeta}>
          {row.created_at ? new Date(row.created_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          {row.rental_id ? ` · #${row.rental_id}` : ''}
        </Text>
        {row.rejection_reason ? <Text style={styles.rowReason}>{row.rejection_reason}</Text> : null}
      </View>
      <View style={styles.rowEnd}>
        <Text style={[styles.rowAmount, { color: out ? '#B91C1C' : '#047857' }]}>
          {out ? '−' : '+'}{formatMoney(Math.abs(row.amount), { decimals: 2 })}
        </Text>
        <Badge label={row.status_label} color={look.color} bg={look.bg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48, gap: 10 },
  balanceCard: { alignItems: 'stretch' },
  balanceLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  balance: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  balanceHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  minHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  growth: { fontSize: 12, color: '#6B7280', marginHorizontal: 4 },
  rateCard: { gap: 8 },
  rateHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  rateValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  rateText: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  rateLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  rateLinkText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  list: { paddingVertical: 4, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#9CA3AF' },
  rowReason: { fontSize: 12, color: '#B91C1C' },
  rowEnd: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  sheetIntro: { fontSize: 13, color: '#4B5563', marginBottom: 12, lineHeight: 19 },
});
