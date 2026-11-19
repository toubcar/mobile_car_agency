import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
 * The agency's money, as on the website's Finance page: it stays with ToubCar until the agency asks for a transfer,
 * sent to the bank account it registered. What it can be paid now, what its bookings in progress will bring, this
 * month's share, its commission rate, the latest movements and its transfer requests.
 */
export default function AgenceFinanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // the dashboard's "Demander un virement" opens the request at once
  const { payout } = useLocalSearchParams<{ payout?: string }>();
  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agency-finance'],
    queryFn: () => financeService.agencyOverview(),
  });

  const openedFromLink = useRef(false);
  useEffect(() => {
    if (payout === '1' && data && !openedFromLink.current) {
      openedFromLink.current = true;
      setRequestOpen(true);
    }
  }, [payout, data]);

  const mutation = useMutation({
    mutationFn: () =>
      financeService.requestPayment({
        amount: Number(amount.replace(',', '.')),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setRequestOpen(false);
      setAmount('');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['agency-finance'] });
      Alert.alert(t('Demande envoyée'), t('ToubCar vous vire ce montant sur votre compte bancaire.'));
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Vérifiez le montant demandé.'))),
  });

  const o = data?.overview;
  const balance = o?.current_balance ?? 0;
  const account = data?.bank_account ?? null;
  const minimum = data?.minimum_payout ?? 100;

  const submit = () => {
    const value = Number(amount.replace(',', '.'));
    if (!value || value < minimum) {
      Alert.alert(t('Montant'), t('Le montant minimum d\'un virement est de :amount MAD.', { amount: minimum }));
      return;
    }
    if (value > balance) {
      Alert.alert(t('Montant'), t('Le montant demandé dépasse votre solde disponible.'));
      return;
    }
    mutation.mutate();
  };

  const openBankAccount = () => {
    setRequestOpen(false);
    router.push({ pathname: '/(agence)/bank-account', params: { from: 'payout' } } as never);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Finance')} subtitle={t('Vos gains et vos virements')} />

      {isLoading || !o ? <Loading /> : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        >
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>{t('Votre argent chez ToubCar')}</Text>
            <Text style={styles.balanceIntro}>{t('Il reste chez ToubCar jusqu\'à ce que vous demandiez un virement : il est alors envoyé sur votre compte bancaire.')}</Text>
            <Text style={styles.balanceLabel}>{t('Disponible')}</Text>
            <Text style={[styles.balance, balance < 0 && { color: '#B91C1C' }]}>{formatMoney(balance, { decimals: 2 })}</Text>
            <Text style={styles.balanceHint}>
              {balance < 0
                ? t('Commission due à ToubCar')
                : t('Peut être viré sur votre compte')}
            </Text>
            <TouchableOpacity style={styles.accountLine} onPress={() => router.push('/(agence)/bank-account' as never)} activeOpacity={0.8}>
              <Ionicons name="card-outline" size={18} color={account ? '#047857' : '#B45309'} />
              <Text style={[styles.accountText, !account && { color: '#B45309' }]} numberOfLines={1}>
                {account ? t('Viré sur :bank · :number', { bank: account.bank_name, number: account.number }) : t('Aucun compte bancaire enregistré')}
              </Text>
              <Text style={styles.accountLink}>{account ? t('Modifier') : t('Ajouter')}</Text>
            </TouchableOpacity>
            <Button
              label={account ? t('Demander un virement') : t('Ajouter mon compte bancaire')}
              icon={account ? 'cash-outline' : 'card-outline'}
              onPress={() => (account ? setRequestOpen(true) : openBankAccount())}
              disabled={!!account && balance < minimum}
              style={{ marginTop: 12 }}
            />
            {account && balance < minimum ? <Text style={styles.minHint}>{t('Un virement peut être demandé à partir de :amount.', { amount: formatMoney(minimum) })}</Text> : null}
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
        title={t('Demander un virement')}
        onClose={() => setRequestOpen(false)}
        footer={account ? (
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setRequestOpen(false)} style={{ flex: 1 }} />
            <Button label={t('Demander le virement')} onPress={submit} loading={mutation.isPending} style={{ flex: 2 }} />
          </>
        ) : (
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setRequestOpen(false)} style={{ flex: 1 }} />
            <Button label={t('Ajouter mon compte bancaire')} onPress={openBankAccount} style={{ flex: 2 }} />
          </>
        )}
      >
        <Text style={styles.sheetIntro}>
          {t('Votre argent est conservé par ToubCar. Il est viré sur votre compte bancaire quand vous le demandez.')}
        </Text>
        {account ? (
          <>
            <View style={styles.sheetAccount}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetAccountKicker}>{t('Viré sur')}</Text>
                <Text style={styles.sheetAccountBank}>{account.bank_name} · {account.number}</Text>
                <Text style={styles.sheetAccountHolder}>{account.account_holder}</Text>
              </View>
              <TouchableOpacity onPress={openBankAccount} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.accountLink}>{t('Modifier')}</Text>
              </TouchableOpacity>
            </View>
            <Field
              label={t('Montant (DH)')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('Montant à virer')}
              hint={t('Disponible : :amount · minimum :minimum', { amount: formatMoney(balance, { decimals: 2 }), minimum: formatMoney(minimum) })}
            />
            <TouchableOpacity onPress={() => setAmount(String(Math.max(0, Math.round(balance * 100) / 100)))} style={styles.allBalance}>
              <Text style={styles.accountLink}>{t('Tout mon solde')}</Text>
            </TouchableOpacity>
            <Field label={t('Note (optionnel)')} value={notes} onChangeText={setNotes} multiline />
          </>
        ) : (
          <Card style={styles.noAccount}>
            <Text style={styles.noAccountTitle}>{t('Aucun compte bancaire enregistré')}</Text>
            <Text style={styles.noAccountText}>{t('Ajoutez d\'abord le compte sur lequel ToubCar vous vire votre argent.')}</Text>
          </Card>
        )}
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
  balanceTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  balanceIntro: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 4, marginBottom: 12 },
  balanceLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  accountLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  accountText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  accountLink: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  sheetAccount: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 12 },
  sheetAccountKicker: { fontSize: 11, color: '#6B7280' },
  sheetAccountBank: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 },
  sheetAccountHolder: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  allBalance: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 10 },
  noAccount: { backgroundColor: '#FFFBEB', gap: 4 },
  noAccountTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  noAccountText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
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
