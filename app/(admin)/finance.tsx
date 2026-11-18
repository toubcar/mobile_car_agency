import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService, type AdminPaymentRequest } from '@/services/finance.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { formatMoney, toAmount } from '@/utils/money';

import { t } from '@/i18n';

export default function AdminFinanceScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'payments' | 'commissions'>('payments');
  const [paymentModal, setPaymentModal] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [payoutAgencyId, setPayoutAgencyId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayout, setShowPayout] = useState(false);

  const paymentsQuery = useQuery({
    queryKey: ['admin-payment-requests'],
    queryFn: () => financeService.adminPaymentRequests(),
    enabled: tab === 'payments',
  });

  const commissionsQuery = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: () => financeService.adminCommissions(),
    enabled: tab === 'commissions',
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      financeService.approvePaymentRequest(paymentModal!.id, {
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setPaymentModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payment-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => financeService.rejectPaymentRequest(paymentModal!.id, reason.trim()),
    onSuccess: () => {
      setPaymentModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payment-requests'] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => financeService.validateCommissions(),
    onSuccess: (res) => Alert.alert(t('Validation'), t(':invalid_count anomalie(s) traitée(s).', { invalid_count: res.invalid_count })),
  });

  const payoutMutation = useMutation({
    mutationFn: () =>
      financeService.processPayout(Number(payoutAgencyId), Number(payoutAmount), notes.trim() || undefined),
    onSuccess: () => {
      setShowPayout(false);
      Alert.alert(t('Succès'), t('Payout enregistré.'));
    },
    onError: () => Alert.alert(t('Erreur'), t('Payout impossible.')),
  });

  const requests = paymentsQuery.data?.data ?? [];
  const stats = paymentsQuery.data?.statistics ?? {};
  const commissions = commissionsQuery.data;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Finance')} subtitle={t('Paiements & commissions')} />

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'payments' && styles.tabOn]} onPress={() => setTab('payments')}>
          <Text style={[styles.tabTxt, tab === 'payments' && styles.tabTxtOn]}>{t('Demandes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'commissions' && styles.tabOn]} onPress={() => setTab('commissions')}>
          <Text style={[styles.tabTxt, tab === 'commissions' && styles.tabTxtOn]}>{t('Commissions')}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'payments' ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={paymentsQuery.isRefetching} onRefresh={() => paymentsQuery.refetch()} />}
        >
          <TouchableOpacity style={styles.payoutBtn} onPress={() => setShowPayout(true)}>
            <Ionicons name="cash-outline" size={18} color="#FFF" />
            <Text style={styles.payoutTxt}>{t('Effectuer un payout agence')}</Text>
          </TouchableOpacity>

          <Text style={styles.meta}>
            {t('En attente :')} {stats.pending_requests ?? stats.pending ?? 0} {t('· Approuvées :')} {stats.approved_requests ?? stats.approved ?? 0}
          </Text>
          {(stats.total_amount ?? 0) > 0 ? (
            <Text style={styles.meta}>{t('Montant en attente :')} {formatMoney(stats.total_amount)}</Text>
          ) : null}

          {paymentsQuery.isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : (
            requests.map((r: AdminPaymentRequest) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.cardTitle}>{r.agency_name ?? t('Agence #:agency_id', { agency_id: r.agency_id })}</Text>
                <Text style={styles.cardSub}>{formatMoney(r.amount)} · {r.status}</Text>
                {r.status === 'pending' ? (
                  <View style={styles.row}>
                    <TouchableOpacity style={styles.btnOk} onPress={() => { setReference(''); setNotes(''); setPaymentModal({ id: r.id, action: 'approve' }); }}>
                      <Text style={styles.btnOkTxt}>{t('Approuver')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnKo} onPress={() => { setReason(''); setPaymentModal({ id: r.id, action: 'reject' }); }}>
                      <Text style={styles.btnKoTxt}>{t('Rejeter')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={commissionsQuery.isRefetching} onRefresh={() => commissionsQuery.refetch()} />}
        >
          {commissionsQuery.isLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : commissions ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('Résumé commissions')}</Text>
                <Text style={styles.cardSub}>
                  {t('Total plateforme :')} {formatMoney(commissions.statistics?.total_admin_commission)}
                </Text>
                <Text style={styles.cardSub}>
                  {t('Ce mois :')} {formatMoney(commissions.statistics?.monthly_commission)} {t("· Aujourd'hui :")} {formatMoney(commissions.statistics?.today_commission)}
                </Text>
                <Text style={styles.cardSub}>
                  {t('Taux appliqué :')} {toAmount(commissions.statistics?.commission_rate)}%
                </Text>
              </View>
              {(commissions.transactions ?? []).slice(0, 20).map((row) => (
                <View key={row.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.agency_name} · {row.car}</Text>
                  <Text style={styles.cardSub}>
                    {formatMoney(row.commission_amount)} ({row.commission_rate}{t('%) · base')} {formatMoney(row.original_amount)}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={styles.payoutBtn} onPress={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
                <Text style={styles.payoutTxt}>{t('Valider les commissions')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={!!paymentModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{paymentModal?.action === 'approve' ? t('Approuver') : t('Rejeter')}</Text>
            {paymentModal?.action === 'approve' ? (
              <>
                <TextInput style={styles.input} value={reference} onChangeText={setReference} placeholder={t('Référence virement')} />
                <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder={t('Note')} />
              </>
            ) : (
              <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder={t('Raison du rejet')} />
            )}
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setPaymentModal(null)}><Text>{t('Annuler')}</Text></TouchableOpacity>
              <TouchableOpacity
                onPress={() => (paymentModal?.action === 'approve' ? approveMutation.mutate() : rejectMutation.mutate())}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{t('Confirmer')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showPayout} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Payout agence')}</Text>
            <TextInput style={styles.input} value={payoutAgencyId} onChangeText={setPayoutAgencyId} placeholder={t('ID agence')} keyboardType="numeric" />
            <TextInput style={styles.input} value={payoutAmount} onChangeText={setPayoutAmount} placeholder={t('Montant')} keyboardType="numeric" />
            <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder={t('Note')} />
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setShowPayout(false)}><Text>{t('Annuler')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => payoutMutation.mutate()}><Text style={{ color: COLORS.primary, fontWeight: '700' }}>{t('Valider')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  tabs: { flexDirection: 'row', margin: 12, backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: '#FFF' },
  tabTxt: { fontWeight: '600', color: '#6B7280' },
  tabTxtOn: { color: COLORS.primary },
  scroll: { padding: 16, paddingBottom: 40 },
  payoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, marginBottom: 12 },
  payoutTxt: { color: '#FFF', fontWeight: '700' },
  meta: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnOk: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, padding: 8, alignItems: 'center' },
  btnOkTxt: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  btnKo: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnKoTxt: { color: '#991B1B', fontWeight: '600', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 10 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
