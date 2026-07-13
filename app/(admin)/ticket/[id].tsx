import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { COLORS } from '@/constants/api';
import { supportService } from '@/services/support.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

export default function AdminTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const ticketId = Number(id);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => supportService.get(ticketId),
    enabled: Number.isFinite(ticketId),
  });

  const replyMutation = useMutation({
    mutationFn: () => supportService.reply(ticketId, reply.trim()),
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: () => Alert.alert('Erreur', 'Envoi impossible.'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'open' | 'in_progress' | 'resolved' | 'closed') =>
      supportService.updateStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  if (isLoading || !ticket) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={`Ticket #${ticket.ticket_number ?? ticket.id}`} subtitle={ticket.subject} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <Text style={styles.meta}>{ticket.status} · {ticket.priority} · {ticket.category ?? '—'}</Text>
          {(ticket.message ?? ticket.description) ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Description</Text>
              <Text style={styles.blockText}>{ticket.message ?? ticket.description}</Text>
            </View>
          ) : null}

          <Text style={styles.blockTitle}>Fil de réponses</Text>
          {(ticket.replies ?? []).length === 0 ? (
            <Text style={styles.emptyReply}>Aucune réponse pour l’instant.</Text>
          ) : (
            (ticket.replies ?? []).map((r, i) => (
              <View key={i} style={styles.reply}>
                <Text style={styles.replyMeta}>{r.user_type} · {new Date(r.created_at).toLocaleString('fr-FR')}</Text>
                <Text style={styles.replyText}>{r.message}</Text>
              </View>
            ))
          )}

          <View style={styles.statusRow}>
            {(['in_progress', 'resolved', 'open'] as const).map((s) => (
              <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => statusMutation.mutate(s)}>
                <Text style={styles.statusBtnTxt}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={reply}
            onChangeText={setReply}
            placeholder="Répondre au ticket…"
            multiline
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !reply.trim() && { opacity: 0.5 }]}
            disabled={!reply.trim() || replyMutation.isPending}
            onPress={() => replyMutation.mutate()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  subject: { fontSize: 20, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 16, textTransform: 'capitalize' },
  block: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 16 },
  blockTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' },
  blockText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  reply: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  replyMeta: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  replyText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  emptyReply: { color: '#9CA3AF', marginBottom: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#EBF5FB' },
  statusBtnTxt: { fontSize: 12, fontWeight: '600', color: COLORS.primary, textTransform: 'capitalize' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12,
    backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 12, backgroundColor: '#F3F4F6',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
