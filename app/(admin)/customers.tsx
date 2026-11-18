import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BackofficeCustomer } from '@/services/customers.service';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { customersService } from '@/services/customers.service';
import { formatMoney } from '@/utils/money';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

import { t, dirIcon } from '@/i18n';

export default function AdminCustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const clientsQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersService.list({ page: 1, search: search || undefined }),
  });

  const clients = clientsQuery.data?.data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Clients & avis')} subtitle={t('Gestion des clients')} />

      <TouchableOpacity style={styles.reviewsLink} onPress={() => router.push('/(admin)/reviews')} activeOpacity={0.85}>
        <Ionicons name="star-outline" size={18} color={COLORS.primary} />
        <Text style={styles.reviewsLinkTxt}>{t('Modération des avis clients')}</Text>
        <Ionicons name={dirIcon('chevron-forward')} size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={t('Rechercher un client…')}
        placeholderTextColor="#9CA3AF"
      />

      {clientsQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={clientsQuery.isRefetching} onRefresh={clientsQuery.refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }: { item: BackofficeCustomer }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/(admin)/customer/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.email ?? '—'} · {t(':count locations', { count: item.total_rentals })}</Text>
              <Text style={styles.cardMeta}>{formatMoney(item.total_spent)} · {item.loyalty_status}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('Aucun client.')}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  reviewsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 12, marginBottom: 4,
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewsLinkTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.primary },
  search: {
    marginHorizontal: 12, marginTop: 8, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  cardMeta: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
