import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messagesService, type InboxConversation } from '@/services/messages.service';
import { COLORS } from '@/constants/api';

export default function MessagesInbox() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['message-conversations'],
    queryFn: () => messagesService.conversations(),
  });

  const conversations = data ?? [];

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune conversation</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.75}
          onPress={() => {
            const conv = item as InboxConversation;
            if (conv.type === 'support') {
              router.push(`/messages/support/${conv.id}` as any);
            } else {
              router.push(`/messages/${conv.id}` as any);
            }
          }}
        >
          <View style={styles.avatar}>
            <Ionicons name="car-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.body}>
            <View style={styles.rowTop}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {item.unread_count > 0 ? (
                <View style={styles.badge}><Text style={styles.badgeTxt}>{item.unread_count}</Text></View>
              ) : null}
            </View>
            <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text>
            {item.last_message?.message ? (
              <Text style={styles.preview} numberOfLines={1}>{item.last_message.message}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6', gap: 12,
    backgroundColor: '#FFF',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  preview: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
});
