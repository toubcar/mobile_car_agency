import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { messagesService, type ChatMessage } from '@/services/messages.service';
import { COLORS } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';

import { t, jsLocale } from '@/i18n';

function isMine(item: ChatMessage, userId?: number): boolean {
  if (item.sender_type === 'admin') return true;
  return item.sender_class === 'App\\Models\\User' && item.sender_id === userId;
}

function senderLabel(item: ChatMessage): string {
  if (item.sender_type === 'admin') return 'Support';
  if (item.sender_type === 'agency') return 'Agence';
  if (item.sender_type === 'client') return 'Client';
  return item.sender_type;
}

export default function SupportMessageThreadScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const tid = Number(ticketId);

  const { data, isLoading } = useQuery({
    queryKey: ['support-messages', tid],
    queryFn: () => messagesService.showSupport(tid),
    enabled: Number.isFinite(tid),
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => messagesService.sendSupport(tid, { message }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['support-messages', tid] });
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  const messages = data?.messages ?? [];
  const conv = data?.conversation;
  const title = conv?.title ?? 'Support';
  const subtitle = conv?.subtitle ?? '';

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = isMine(item, userId);
    return (
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
        {!mine ? <Text style={styles.senderLbl}>{senderLabel(item)}</Text> : null}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.message}</Text>
          {item.created_at ? (
            <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
              {new Date(item.created_at).toLocaleTimeString(jsLocale(), { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            data={[...messages].reverse()}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            inverted
            ListEmptyComponent={
              <View style={styles.emptyThread}>
                <Text style={styles.emptyThreadTxt}>{t('Aucun message — répondez pour démarrer la conversation.')}</Text>
              </View>
            }
            renderItem={renderItem}
          />
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('Répondre en tant que support…')}
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              disabled={!text.trim() || sendMutation.isPending}
              onPress={() => sendMutation.mutate(text.trim())}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  list: { padding: 16, gap: 8 },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 10 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  senderLbl: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 4, marginLeft: 4 },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bubbleOther: {},
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextMine: { color: '#FFF' },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  emptyThread: { padding: 24, alignItems: 'center' },
  emptyThreadTxt: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
