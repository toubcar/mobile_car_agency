import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BackofficeCustomer } from '@/services/customers.service';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { customersService } from '@/services/customers.service';
import { formatMoney } from '@/utils/money';

export default function AdminCustomersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'clients' | 'reviews'>('clients');

  const clientsQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersService.list({ page: 1, search: search || undefined }),
    enabled: tab === 'clients',
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => customersService.reviews({ per_page: 30 }),
    enabled: tab === 'reviews',
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      action === 'approve' ? customersService.approveReview(id) : customersService.rejectReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const clients = clientsQuery.data?.data ?? [];
  const reviews = reviewsQuery.data?.data ?? [];
  const isLoading = tab === 'clients' ? clientsQuery.isLoading : reviewsQuery.isLoading;
  const refetch = tab === 'clients' ? clientsQuery.refetch : reviewsQuery.refetch;
  const isRefetching = tab === 'clients' ? clientsQuery.isRefetching : reviewsQuery.isRefetching;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.topTitle}>Clients & avis</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'clients' && styles.tabOn]} onPress={() => setTab('clients')}>
          <Text style={[styles.tabTxt, tab === 'clients' && styles.tabTxtOn]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'reviews' && styles.tabOn]} onPress={() => setTab('reviews')}>
          <Text style={[styles.tabTxt, tab === 'reviews' && styles.tabTxtOn]}>Avis</Text>
        </TouchableOpacity>
      </View>

      {tab === 'clients' ? (
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un client…"
          placeholderTextColor="#9CA3AF"
        />
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : tab === 'clients' ? (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }: { item: BackofficeCustomer }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/(admin)/customer/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.email ?? '—'} · {item.total_rentals} locations</Text>
              <Text style={styles.cardMeta}>{formatMoney(item.total_spent)} · {item.loyalty_status}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucun client.</Text>}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.user ?? 'Client'} · ★{item.rating}</Text>
              <Text style={styles.cardSub}>{item.target ?? item.review_type} · {item.status}</Text>
              {item.comment ? <Text style={styles.cardComment}>{item.comment}</Text> : null}
              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => reviewMutation.mutate({ id: item.id, action: 'approve' })}>
                    <Text style={styles.btnPrimaryTxt}>Approuver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDanger} onPress={() => reviewMutation.mutate({ id: item.id, action: 'reject' })}>
                    <Text style={styles.btnDangerTxt}>Rejeter</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucun avis.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },
  tabs: { flexDirection: 'row', margin: 12, backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: '#FFF' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTxtOn: { color: COLORS.primary },
  search: {
    marginHorizontal: 12, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  cardMeta: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  cardComment: { fontSize: 13, color: '#374151', marginTop: 8, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary },
  btnPrimaryTxt: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  btnDanger: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEE2E2' },
  btnDangerTxt: { fontSize: 12, fontWeight: '600', color: '#991B1B' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
