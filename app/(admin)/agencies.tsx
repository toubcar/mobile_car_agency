import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { COLORS } from '@/constants/api';
import { ADMIN_BG, adminShadow } from '@/constants/adminTheme';
import { agenciesService } from '@/services/agencies.service';
import { marketingService } from '@/services/marketing.service';
import type { PartnerAgency } from '@/types';

import { describeApiError } from '@/utils/apiError';
import { t } from '@/i18n';

const FILTERS = [
  { key: '', get label() { return t('Toutes'); } },
  { key: 'pending', get label() { return t('En attente'); } },
  { key: 'approved', get label() { return t('Approuvées'); } },
  { key: 'rejected', get label() { return t('Rejetées'); } },
  { key: 'suspended', get label() { return t('Suspendues'); } },
];

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  pending: { get label() { return t('En attente'); }, bg: '#FEF3C7', text: '#92400E' },
  approved: { get label() { return t('Approuvée'); }, bg: '#D1FAE5', text: '#065F46' },
  rejected: { get label() { return t('Rejetée'); }, bg: '#FEE2E2', text: '#991B1B' },
  suspended: { get label() { return t('Suspendue'); }, bg: '#E5E7EB', text: '#374151' },
};

export default function AdminAgenciesScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [reasonModal, setReasonModal] = useState<{
    type: 'reject' | 'suspend';
    agency: PartnerAgency;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [commissionModal, setCommissionModal] = useState<PartnerAgency | null>(null);
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionError, setCommissionError] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-agencies', status, search],
    queryFn:  () => agenciesService.list({ status: status || undefined, search: search || undefined }),
    retry:    1,
  });

  const list = data?.data ?? [];
  const stats = data?.statistics;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-backoffice-overview'] });
  };

  // The server answers in the app's language and says why when it refuses (already decided by another admin...)
  const showError = (err: unknown) => {
    invalidate();
    Alert.alert(t('Erreur'), describeApiError(err));
  };

  const approveMutation = useMutation({
    mutationFn: (agency: PartnerAgency) => agenciesService.approve(agency.id, agency.commission_rate ?? 10),
    onSuccess: invalidate,
    onError: showError,
  });
  const unsuspendMutation = useMutation({
    mutationFn: (agency: PartnerAgency) => agenciesService.unsuspend(agency.id),
    onSuccess: invalidate,
    onError: showError,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ agency, text }: { agency: PartnerAgency; text: string }) => agenciesService.reject(agency.id, text),
    onSuccess: (result) => {
      invalidate();
      closeReasonModal();
      // the last allowed attempt removes the agency: tell the admin, as the website does
      if (result.removed) Alert.alert(t('Agence supprimée'), result.message);
    },
    onError: (err) => { closeReasonModal(); showError(err); },
  });
  const suspendMutation = useMutation({
    mutationFn: ({ agency, text }: { agency: PartnerAgency; text: string }) => agenciesService.suspend(agency.id, text),
    onSuccess: () => { invalidate(); closeReasonModal(); },
    onError: showError,
  });
  const commissionMutation = useMutation({
    mutationFn: ({ agency, rate }: { agency: PartnerAgency; rate: number }) => agenciesService.updateCommission(agency.id, rate),
    onSuccess: () => { invalidate(); closeCommissionModal(); },
  });
  const resetCancelMutation = useMutation({
    mutationFn: (agencyId: number) => marketingService.resetCancellationCount(agencyId),
    onSuccess: invalidate,
  });

  const busyId = useMemo(() => {
    const pending = [approveMutation, unsuspendMutation].find((m) => m.isPending)?.variables as PartnerAgency | undefined;
    return pending?.id;
  }, [approveMutation.isPending, approveMutation.variables, unsuspendMutation.isPending, unsuspendMutation.variables]);

  const closeReasonModal = () => {
    setReasonModal(null);
    setReason('');
    setReasonError('');
  };

  const submitReasonAction = () => {
    if (!reasonModal) return;
    if (reason.trim().length < 10) {
      setReasonError('Veuillez saisir au moins 10 caractères.');
      return;
    }
    if (reasonModal.type === 'reject') {
      rejectMutation.mutate({ agency: reasonModal.agency, text: reason.trim() });
    } else {
      suspendMutation.mutate({ agency: reasonModal.agency, text: reason.trim() });
    }
  };

  const openCommissionModal = (agency: PartnerAgency) => {
    setCommissionModal(agency);
    setCommissionRate(String(agency.commission_rate ?? 10));
    setCommissionError('');
  };

  const closeCommissionModal = () => {
    setCommissionModal(null);
    setCommissionRate('');
    setCommissionError('');
  };

  const submitCommission = () => {
    if (!commissionModal) return;
    const rate = Number(commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setCommissionError('Le taux doit être entre 0 et 100%.');
      return;
    }
    commissionMutation.mutate({ agency: commissionModal, rate });
  };

  const renderItem = ({ item }: { item: PartnerAgency }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Ionicons name="business" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLES[item.status ?? 'pending']?.bg ?? '#F3F4F6' }]}>
              <Text style={[styles.statusText, { color: STATUS_STYLES[item.status ?? 'pending']?.text ?? '#374151' }]}>
                {STATUS_STYLES[item.status ?? 'pending']?.label ?? item.status ?? '—'}
              </Text>
            </View>
          </View>
          {item.email ? <Text style={styles.meta}>{item.email}</Text> : null}
          {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
          {item.city ? <Text style={styles.meta}>{item.city}</Text> : null}
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}><Text style={styles.kpiVal}>{item.cars_count ?? 0}</Text><Text style={styles.kpiLabel}>{t('Véhicules')}</Text></View>
        <View style={styles.kpi}><Text style={styles.kpiVal}>{item.bookings_count ?? 0}</Text><Text style={styles.kpiLabel}>{t('Locations')}</Text></View>
        <TouchableOpacity style={[styles.kpi, styles.kpiTouchable]} onPress={() => openCommissionModal(item)} activeOpacity={0.82}>
          <Text style={styles.kpiVal}>{item.commission_rate ?? 0}%</Text>
          <Text style={styles.kpiLabel}>{t('Commission')}</Text>
        </TouchableOpacity>
        <View style={styles.kpi}><Text style={styles.kpiVal}>{item.tries_count ?? 0}</Text><Text style={styles.kpiLabel}>{t('Tentatives')}</Text></View>
      </View>

      {item.rejection_reason ? <Text style={styles.warningText}>{t('Rejet:')} {item.rejection_reason}</Text> : null}
      {item.suspension_reason ? <Text style={styles.warningText}>{t('Suspension:')} {item.suspension_reason}</Text> : null}

      <View style={styles.actions}>
        {item.status !== 'approved' && (
          <TouchableOpacity
            style={[styles.action, styles.approve]}
            disabled={busyId === item.id}
            onPress={() => approveMutation.mutate(item)}
          >
            {busyId === item.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionWhite}>{t('Approuver')}</Text>}
          </TouchableOpacity>
        )}
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.action, styles.reject]} onPress={() => setReasonModal({ type: 'reject', agency: item })}>
            <Text style={styles.actionDanger}>{t('Rejeter')}</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'suspended' && !item.is_suspended ? (
          <TouchableOpacity style={[styles.action, styles.neutral]} onPress={() => setReasonModal({ type: 'suspend', agency: item })}>
            <Text style={styles.actionNeutral}>{t('Suspendre')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.action, styles.neutral]} onPress={() => unsuspendMutation.mutate(item)}>
            <Text style={styles.actionNeutral}>{t('Réactiver')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.action, styles.outline]} onPress={() => openCommissionModal(item)}>
          <Text style={styles.outlineText}>{t('Commission')}</Text>
        </TouchableOpacity>
        {(item.cancellation_count ?? 0) > 0 ? (
          <TouchableOpacity
            style={[styles.action, styles.neutral]}
            onPress={() => resetCancelMutation.mutate(item.id)}
            disabled={resetCancelMutation.isPending}
          >
            <Text style={styles.actionNeutral}>{t('Reset annulations')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const ListHeader = (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="business-outline" size={26} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>{t('Back-office administrateur')}</Text>
          <Text style={styles.heroTitle}>{t('Partenaires ToubCar')}</Text>
          <Text style={styles.heroSub}>{t('Validation, documents, suspension et commission.')}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statPrimary]}><Text style={[styles.statVal, styles.statValLight]}>{stats?.total ?? 0}</Text><Text style={[styles.statLabel, styles.statLabelLight]}>{t('Total')}</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{stats?.pending ?? 0}</Text><Text style={styles.statLabel}>{t('En attente')}</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{stats?.approved ?? 0}</Text><Text style={styles.statLabel}>{t('Approuvées')}</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{stats?.suspended ?? 0}</Text><Text style={styles.statLabel}>{t('Suspendues')}</Text></View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('Rechercher agence, email, responsable...')}
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key || 'all'}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterPill, status === item.key && styles.filterActive]}
            onPress={() => setStatus(item.key)}
          >
            <Text style={[styles.filterText, status === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </>
  );

  const ReasonModal = (
    <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={closeReasonModal}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name={reasonModal?.type === 'reject' ? 'close-circle-outline' : 'ban-outline'} size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {reasonModal?.type === 'reject' ? t('Rejeter l’agence') : t('Suspendre l’agence')}
            </Text>
            <Text style={styles.modalSub}>
              {reasonModal?.agency.name} {t('— la raison sera enregistrée.')}
            </Text>
            <TextInput
              value={reason}
              onChangeText={(value) => { setReason(value); setReasonError(''); }}
              placeholder={t('Saisir une raison claire (min. 10 caractères)')}
              placeholderTextColor="#9CA3AF"
              multiline
              style={styles.reasonInput}
              textAlignVertical="top"
            />
            {reasonError ? <Text style={styles.modalError}>{reasonError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeReasonModal}>
                <Text style={styles.cancelText}>{t('Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitReasonAction}>
                {(rejectMutation.isPending || suspendMutation.isPending)
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.confirmText}>{t('Confirmer')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const CommissionModal = (
    <Modal visible={!!commissionModal} transparent animationType="fade" onRequestClose={closeCommissionModal}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('Modifier la commission')}</Text>
            <Text style={styles.modalSub}>
              {commissionModal?.name} {t('— ce taux sera utilisé pour les calculs financiers.')}
            </Text>
            <TextInput
              value={commissionRate}
              onChangeText={(value) => { setCommissionRate(value); setCommissionError(''); }}
              placeholder={t('Taux de commission (%)')}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={styles.commissionInput}
            />
            {commissionError ? <Text style={styles.modalError}>{commissionError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeCommissionModal}>
                <Text style={styles.cancelText}>{t('Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitCommission}>
                {commissionMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>{t('Enregistrer')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Agences partenaires')} subtitle={t('Validation, rejet, suspension — comme sur le site')} />
      {ReasonModal}
      {CommissionModal}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={styles.errTitle}>{t('Impossible de charger les agences')}</Text>
          <Text style={styles.errSub}>
            {t('Vérifiez votre connexion et réessayez.')}
          </Text>
          <TouchableOpacity style={styles.retry} onPress={() => refetch()} activeOpacity={0.85}>
            <Text style={styles.retryTxt}>{t('Réessayer')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t('Aucune agence')}</Text>
              <Text style={styles.emptySub}>{t('Les agences partenaires apparaîtront ici.')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  list:   { padding: 16, paddingBottom: 100 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 3 },
  heroSub: { fontSize: 12, color: '#D6EAF8', marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...adminShadow.card,
  },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body:   { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name:   { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827' },
  meta:   { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 14, padding: 12, ...adminShadow.card },
  statPrimary: { backgroundColor: COLORS.primary },
  statVal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statValLight: { color: '#FFF' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginTop: 3 },
  statLabelLight: { color: '#D6EAF8' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  filters: { gap: 8, paddingBottom: 12 },
  filterPill: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '800' },
  filterTextActive: { color: '#FFF' },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  kpi: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  kpiTouchable: { borderWidth: 1, borderColor: '#D6EAF8' },
  kpiVal: { fontSize: 15, fontWeight: '800', color: '#111827' },
  kpiLabel: { fontSize: 10, color: '#8E8E93', marginTop: 2, fontWeight: '700' },
  warningText: { marginTop: 10, fontSize: 12, color: '#B45309', lineHeight: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  action: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, minWidth: 96, alignItems: 'center' },
  approve: { backgroundColor: COLORS.primary },
  reject: { backgroundColor: '#FEF2F2' },
  neutral: { backgroundColor: '#F3F4F6' },
  outline: { backgroundColor: '#EBF5FB' },
  actionWhite: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  actionDanger: { color: '#991B1B', fontSize: 12, fontWeight: '800' },
  actionNeutral: { color: '#374151', fontSize: 12, fontWeight: '800' },
  outlineText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.42)', justifyContent: 'flex-end' },
  modalKeyboard: { width: '100%' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26, ...adminShadow.nav },
  modalIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: 6 },
  reasonInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginTop: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  commissionInput: { borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, color: '#111827', fontWeight: '700', fontSize: 15 },
  modalError: { fontSize: 12, color: '#991B1B', fontWeight: '700', marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, borderRadius: 13, paddingVertical: 13, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmBtn: { flex: 1, borderRadius: 13, paddingVertical: 13, backgroundColor: COLORS.primary, alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '800' },
  confirmText: { color: '#FFF', fontWeight: '800' },
  empty:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle:{ fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptySub:  { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errTitle:  { fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 12, textAlign: 'center' },
  errSub:    { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retry:     { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryTxt:  { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
