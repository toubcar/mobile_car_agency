import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messagesService, type InboxConversation } from '@/services/messages.service';
import { COLORS } from '@/constants/api';
import { adminShadow } from '@/constants/adminTheme';

type FilterKey = 'all' | 'client' | 'agency';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'client', label: 'Clients' },
  { key: 'agency', label: 'Agences' },
];

function peerIcon(peer?: string | null): React.ComponentProps<typeof Ionicons>['name'] {
  if (peer === 'agency') return 'business-outline';
  if (peer === 'client') return 'person-outline';
  return 'headset-outline';
}

function peerColor(peer?: string | null): string {
  if (peer === 'agency') return '#7C3AED';
  if (peer === 'client') return '#2563EB';
  return COLORS.primary;
}

export default function AdminMessagesInbox({
  queryCacheKey = 'admin',
  heroIcon = 'headset',
  heroTitle = 'Support ToubCar',
  heroSubtitle = 'Conversations admin ↔ client et admin ↔ agence',
  showPeerFilters = true,
  emptySubtitle = 'Les tickets support ouverts par les clients et les agences apparaîtront ici.',
}: {
  queryCacheKey?: string;
  heroIcon?: React.ComponentProps<typeof Ionicons>['name'];
  heroTitle?: string;
  heroSubtitle?: string;
  showPeerFilters?: boolean;
  emptySubtitle?: string;
} = {}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['message-conversations', queryCacheKey],
    queryFn: () => messagesService.conversations(),
    refetchInterval: 30_000,
  });

  const conversations = useMemo(() => {
    const list = data ?? [];
    if (filter === 'all') return list;
    return list.filter((c) => c.peer_type === filter);
  }, [data, filter]);

  const totalUnread = useMemo(
    () => (data ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [data],
  );

  const openThread = (item: InboxConversation) => {
    if (item.type === 'support') {
      router.push(`/messages/support/${item.id}` as any);
      return;
    }
    router.push(`/messages/${item.id}` as any);
  };

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name={heroIcon} size={22} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSub}>
            {heroSubtitle}
            {totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>

      {showPeerFilters ? (
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === 'all'
              ? (data ?? []).length
              : (data ?? []).filter((c) => c.peer_type === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>{f.label} ({count})</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      ) : null}

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySub}>{emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => openThread(item)}>
              <View style={[styles.avatar, { backgroundColor: `${peerColor(item.peer_type)}18` }]}>
                <Ionicons name={peerIcon(item.peer_type)} size={20} color={peerColor(item.peer_type)} />
              </View>
              <View style={styles.body}>
                <View style={styles.rowTop}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  {item.unread_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text>
                {item.last_message && 'message' in item.last_message && item.last_message.message ? (
                  <Text style={styles.preview} numberOfLines={1}>{item.last_message.message}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <View style={[styles.statusPill, { backgroundColor: item.status === 'open' ? '#FEF3C7' : '#E5E7EB' }]}>
                    <Text style={styles.statusTxt}>{item.status}</Text>
                  </View>
                  {item.peer_type ? (
                    <Text style={styles.peerTag}>{item.peer_type === 'client' ? 'Client' : 'Agence'}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 14,
    ...adminShadow.card,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 15 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  chipTxtOn: { color: '#FFF' },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#FFF',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  preview: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusTxt: { fontSize: 10, fontWeight: '700', color: '#92400E', textTransform: 'capitalize' },
  peerTag: { fontSize: 10, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
