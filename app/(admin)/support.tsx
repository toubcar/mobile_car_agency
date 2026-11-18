import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { supportService, type SupportTicket } from '@/services/support.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

import { t } from '@/i18n';

const STATUS_FILTERS = [
  { key: '', get label() { return t('Tous'); } },
  { key: 'open', get label() { return t('Ouverts'); } },
  { key: 'in_progress', get label() { return t('En cours'); } },
  { key: 'resolved', get label() { return t('Résolus'); } },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export default function AdminSupportScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [replyModal, setReplyModal] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['support-tickets', status],
    queryFn: () => supportService.list({ page: 1, status: status || undefined }),
  });

  const tickets = data?.data ?? [];
  const stats = data?.statistics;

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: number; s: SupportTicket['status'] }) => supportService.updateStatus(id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, p }: { id: number; p: SupportTicket['priority'] }) => supportService.updatePriority(id, p),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });

  const replyMutation = useMutation({
    mutationFn: () => supportService.reply(replyModal!.id, replyText.trim()),
    onSuccess: () => {
      setReplyModal(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Support')} subtitle={t('Tickets & assistance')} />

      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.open}</Text><Text style={styles.statLbl}>{t('Ouverts')}</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.urgent}</Text><Text style={styles.statLbl}>{t('Urgents')}</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLbl}>{t('Total')}</Text></View>
        </View>
      ) : null}

      <View style={styles.chips}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.chip, status === f.key && styles.chipOn]} onPress={() => setStatus(f.key)}>
            <Text style={[styles.chipTxt, status === f.key && styles.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/(admin)/ticket/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.subject}</Text>
              <Text style={styles.cardSub}>#{item.ticket_number ?? item.id} · {item.status} · {item.priority}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnNeutral} onPress={() => setReplyModal(item)}>
                  <Text style={styles.btnNeutralTxt}>{t('Répondre')}</Text>
                </TouchableOpacity>
                {item.status === 'open' ? (
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => statusMutation.mutate({ id: item.id, s: 'in_progress' })}>
                    <Text style={styles.btnPrimaryTxt}>{t('En cours')}</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status !== 'resolved' && item.status !== 'closed' ? (
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => statusMutation.mutate({ id: item.id, s: 'resolved' })}>
                    <Text style={styles.btnPrimaryTxt}>{t('Résoudre')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.prioChip, item.priority === p && styles.prioChipOn]}
                    onPress={() => priorityMutation.mutate({ id: item.id, p })}
                  >
                    <Text style={[styles.prioTxt, item.priority === p && styles.prioTxtOn]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('Aucun ticket.')}</Text>}
        />
      )}

      <Modal visible={!!replyModal} transparent animationType="fade" onRequestClose={() => setReplyModal(null)}>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Répondre au ticket')}</Text>
            <TextInput
              style={styles.modalInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder={t('Votre message…')}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReplyModal(null)}><Text style={styles.modalCancel}>{t('Annuler')}</Text></TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                disabled={!replyText.trim() || replyMutation.isPending}
                onPress={() => replyMutation.mutate()}
              >
                <Text style={styles.modalSubmitTxt}>{t('Envoyer')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  stat: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipTxtOn: { color: '#FFF' },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btnNeutral: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  btnNeutralTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },
  btnPrimary: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary },
  btnPrimaryTxt: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  prioChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F9FAFB' },
  prioChipOn: { backgroundColor: '#FEF3C7' },
  prioTxt: { fontSize: 10, color: '#6B7280', textTransform: 'capitalize' },
  prioTxtOn: { color: '#92400E', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalInput: { minHeight: 100, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16 },
  modalCancel: { color: '#6B7280', fontWeight: '600' },
  modalSubmit: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalSubmitTxt: { color: '#FFF', fontWeight: '700' },
});
