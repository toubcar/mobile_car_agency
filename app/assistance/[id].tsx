import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useRef, useState } from 'react';
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { supportService, type SupportConversationEntry } from '@/services/support.service';
import { ticketStatusColor, ticketStatusLabel } from '@/utils/supportLabels';
import { useAuthStore } from '@/store/authStore';
import { t, jsLocale } from '@/i18n';

/** Un ticket et sa conversation avec l'administration : on répond, on le clôt ou on le rouvre. */
export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = Number(id);
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const listRef = useRef<FlatList<SupportConversationEntry>>(null);
  const [text, setText] = useState('');

  // Mine: what the signed-in side wrote (a customer's messages are "client", an agency's "agency")
  const mine = role === 'agence' ? 'agency' : 'client';

  const { data: ticket, isLoading, isError, refetch } = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => supportService.get(ticketId),
    enabled: Number.isFinite(ticketId),
    refetchInterval: 15000,
  });

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ['support'] });
  };
  const fail = (err: unknown) => {
    const body = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined) : undefined;
    Alert.alert(t('Envoi impossible.'), body?.message ?? t('Réessayez dans un instant.'));
  };

  const reply = useMutation({
    mutationFn: () => supportService.reply(ticketId, text.trim()),
    onSuccess: () => {
      setText('');
      done();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    },
    onError: fail,
  });

  const changeStatus = useMutation({
    mutationFn: (status: 'resolved' | 'open') => supportService.updateStatus(ticketId, status),
    onSuccess: done,
    onError: fail,
  });

  const conversation = (ticket?.conversation ?? []).filter((entry) => entry.message.trim() !== '');
  const closed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title={ticket?.subject ?? t('Ticket')} />

      {isError ? (
        <TouchableOpacity style={styles.errorBox} onPress={() => refetch()} activeOpacity={0.85}>
          <Text style={styles.errorTitle}>{t('Chargement impossible')}</Text>
          <Text style={styles.errorSub}>{t('Appuyez pour réessayer')}</Text>
        </TouchableOpacity>
      ) : isLoading || !ticket ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View style={styles.statusBar}>
            <View style={[styles.badge, { backgroundColor: `${ticketStatusColor(ticket.status)}1A` }]}>
              <Text style={[styles.badgeText, { color: ticketStatusColor(ticket.status) }]}>{ticketStatusLabel(ticket.status)}</Text>
            </View>
            {ticket.ticket_number ? <Text style={styles.number}>{ticket.ticket_number}</Text> : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => changeStatus.mutate(closed ? 'open' : 'resolved')}
              disabled={changeStatus.isPending}
              activeOpacity={0.8}
              style={styles.statusBtn}
            >
              <Ionicons name={closed ? 'refresh-outline' : 'checkmark-done-outline'} size={16} color={COLORS.primary} />
              <Text style={styles.statusBtnText}>{closed ? t('Rouvrir') : t('Marquer comme résolu')}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            data={[{ from: mine, message: ticket.message ?? ticket.description ?? '', created_at: ticket.created_at } as SupportConversationEntry, ...conversation]}
            keyExtractor={(_, index) => String(index)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.from === 'system') {
                return <Text style={styles.system}>{item.message}</Text>;
              }
              const own = item.from === mine;
              return (
                <View style={[styles.bubbleWrap, own && styles.bubbleWrapOwn]}>
                  {!own ? <Text style={styles.sender}>{t('Assistance ToubCar')}</Text> : null}
                  <View style={[styles.bubble, own && styles.bubbleOwn]}>
                    <Text style={[styles.bubbleText, own && styles.bubbleTextOwn]}>{item.message}</Text>
                    {item.created_at ? (
                      <Text style={[styles.time, own && styles.timeOwn]}>
                        {new Date(item.created_at).toLocaleString(jsLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={text}
              onChangeText={setText}
              placeholder={t('Votre message…')}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.send, (!text.trim() || reply.isPending) && { opacity: 0.5 }]}
              onPress={() => reply.mutate()}
              disabled={!text.trim() || reply.isPending}
              activeOpacity={0.85}
            >
              {reply.isPending ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  number: { fontSize: 12, color: '#9CA3AF' },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  list: { padding: 16, gap: 10 },
  system: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginVertical: 2 },
  bubbleWrap: { alignItems: 'flex-start' },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  sender: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 4, marginHorizontal: 4 },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleOwn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextOwn: { color: '#FFF' },
  time: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  timeOwn: { color: 'rgba(255,255,255,0.75)' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  composerInput: { flex: 1, maxHeight: 120, backgroundColor: '#F3F4F6', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: 24, padding: 24, backgroundColor: '#FFFBEB', borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FDE68A' },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  errorSub: { fontSize: 12, color: '#B45309' },
});
