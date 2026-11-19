import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminShadow } from '@/constants/adminTheme';
import { financeService } from '@/services/finance.service';
import { formatMoney } from '@/utils/money';

import { t } from '@/i18n';

/**
 * The agency's money on its dashboard, as on the website: it stays with ToubCar until the agency asks for a transfer,
 * sent to the bank account it registered. Available now, upcoming (bookings paid online, released at their end),
 * transfers asked for, and where they go.
 */
export default function MoneyCard() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['agency-finance'],
    queryFn: () => financeService.agencyOverview(),
  });

  if (isLoading || !data) {
    return <View style={[styles.card, styles.loading]}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  const o = data.overview;
  const account = data.bank_account ?? null;
  const minimum = data.minimum_payout ?? 100;
  const available = o.current_balance;
  const canAsk = !!account && available >= minimum;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headIcon}><Ionicons name="wallet-outline" size={18} color={COLORS.primary} /></View>
        <Text style={styles.title}>{t('Votre argent chez ToubCar')}</Text>
      </View>
      <Text style={styles.intro}>{t('Il reste chez ToubCar jusqu\'à ce que vous demandiez un virement : il est alors envoyé sur votre compte bancaire.')}</Text>

      <Text style={styles.availableLabel}>{t('Disponible')}</Text>
      <Text style={[styles.available, available < 0 && { color: '#B91C1C' }]}>{formatMoney(available, { decimals: 2 })}</Text>
      <Text style={styles.availableHint}>{available < 0 ? t('Commission due à ToubCar') : t('Peut être viré sur votre compte')}</Text>

      <View style={styles.row}>
        <View style={[styles.mini, { backgroundColor: '#FFFBEB' }]}>
          <Text style={[styles.miniLabel, { color: '#92400E' }]}>{t('À venir')}</Text>
          <Text style={[styles.miniValue, { color: '#B45309' }]}>{formatMoney(o.upcoming_earnings)}</Text>
          <Text style={styles.miniHint}>{t('Disponibles à la fin des locations payées')}</Text>
        </View>
        <View style={[styles.mini, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.miniLabel, { color: '#1E40AF' }]}>{t('Virements en cours')}</Text>
          <Text style={[styles.miniValue, { color: '#1D4ED8' }]}>{formatMoney(o.pending_earnings)}</Text>
          <Text style={styles.miniHint}>{t('Demandés, en attente de ToubCar')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.account} onPress={() => router.push('/(agence)/bank-account' as never)} activeOpacity={0.8}>
        <Ionicons name="card-outline" size={18} color={account ? '#047857' : '#B45309'} />
        <Text style={[styles.accountText, !account && { color: '#B45309' }]} numberOfLines={1}>
          {account ? t('Viré sur :bank · :number', { bank: account.bank_name, number: account.number }) : t('Aucun compte bancaire enregistré')}
        </Text>
        <Text style={styles.link}>{account ? t('Modifier') : t('Ajouter')}</Text>
      </TouchableOpacity>

      {account ? (
        <TouchableOpacity
          style={[styles.button, !canAsk && styles.buttonOff]}
          disabled={!canAsk}
          onPress={() => router.push({ pathname: '/(agence)/finance', params: { payout: '1' } } as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('Demander un virement')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(agence)/bank-account' as never)} activeOpacity={0.85}>
          <Ionicons name="card-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('Ajouter mon compte bancaire')}</Text>
        </TouchableOpacity>
      )}
      {account && available < minimum ? (
        <Text style={styles.minHint}>{t('Un virement peut être demandé à partir de :amount.', { amount: formatMoney(minimum) })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 18, ...adminShadow.card },
  loading: { alignItems: 'center', paddingVertical: 28 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827' },
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 8, marginBottom: 12 },
  availableLabel: { fontSize: 12, fontWeight: '700', color: '#047857' },
  available: { fontSize: 30, fontWeight: '800', color: '#047857', marginTop: 2 },
  availableHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  mini: { flex: 1, borderRadius: 14, padding: 12 },
  miniLabel: { fontSize: 11, fontWeight: '800' },
  miniValue: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  miniHint: { fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 15 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  accountText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  link: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderRadius: 12, paddingVertical: 13, backgroundColor: COLORS.primary },
  buttonOff: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  minHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
});
