import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { messagesService, type RentalMessage } from '@/services/messages.service';
import { COLORS } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';

import { t, jsLocale } from '@/i18n';

export default function MessageThreadScreen() {
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const rid = Number(rentalId);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', rid],
    queryFn: () => messagesService.showRental(rid),
    enabled: Number.isFinite(rid),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => messagesService.sendRental(rid, { message }),
    onSuccess: () => {
      setText('');
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['messages', rid] });
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSendError(err?.response?.data?.message ?? t("Impossible d'envoyer le message."));
    },
  });

  const messages = data?.messages ?? [];
  const conversation = data?.conversation;
  const agency = conversation?.agency;
  const agencyName = agency?.name ?? conversation?.title ?? 'Conversation';
  const carSubtitle = conversation?.subtitle;

  const renderItem = ({ item }: { item: RentalMessage }) => {
    const mine = item.sender_id === userId;
    return (
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
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
        <View style={styles.headerCenter}>
          {agency?.id ? (
            <TouchableOpacity
              style={styles.headerTitleBtn}
              onPress={() => router.push(`/agency/${agency.id}`)}
              activeOpacity={0.75}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>{agencyName}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerTitle} numberOfLines={1}>{agencyName}</Text>
          )}
          {carSubtitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>{carSubtitle}</Text>
          ) : null}
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
            renderItem={renderItem}
          />
          {sendError ? (
            <View style={styles.sendErrorBar}>
              <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
              <Text style={styles.sendErrorTxt}>{sendError}</Text>
            </View>
          ) : null}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('Votre message…')}
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  headerTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, textAlign: 'center', flexShrink: 1 },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 8 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bubbleOther: {},
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextMine: { color: '#FFF' },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
  sendErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sendErrorTxt: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '600' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12,
    backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, backgroundColor: '#F3F4F6',
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
