import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { notificationsService } from '@/services/notifications.service';
import { resolveNotificationRoute } from '@/utils/notificationNavigation';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

import { t, chevronChar } from '@/i18n';

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list({ limit: 50 }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => notificationsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAll = useMutation({
    mutationFn: () => notificationsService.clearAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.data ?? [];
  const stats = data?.statistics;

  const openNotification = (item: (typeof items)[number]) => {
    if (!item.is_read) markRead.mutate(item.id);
    const route = resolveNotificationRoute(item, 'admin');
    if (route) router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Notifications')} subtitle={t('Alertes plateforme')} />

      {stats ? (
        <View style={styles.statsRow}>
          <Text style={styles.statsTxt}>{stats.unread} {t('non lues ·')} {stats.total} total</Text>
          <View style={styles.statsActions}>
            <TouchableOpacity onPress={() => markAll.mutate()}><Text style={styles.link}>{t('Tout lire')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => clearAll.mutate()}><Text style={[styles.link, styles.linkDanger]}>{t('Effacer')}</Text></TouchableOpacity>
          </View>
        </View>
      ) : null}

      {isError ? (
        <TouchableOpacity style={styles.errorBox} onPress={() => refetch()} activeOpacity={0.85}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B45309" />
          <Text style={styles.errorTitle}>{t('Impossible de charger les notifications')}</Text>
          <Text style={styles.errorSub}>{t('Appuyez pour réessayer')}</Text>
        </TouchableOpacity>
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.is_read && styles.cardUnread]}
              onPress={() => openNotification(item)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.message ? <Text style={styles.cardMsg}>{item.message}</Text> : null}
                <Text style={styles.cardTime}>{item.time_ago ?? item.created_at ?? ''}</Text>
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.cardArrow}>{chevronChar()}</Text>
                <TouchableOpacity
                  onPress={() => remove.mutate(item.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('Aucune notification.')}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', marginBottom: 8,
  },
  statsTxt: { fontSize: 13, color: '#6B7280' },
  statsActions: { flexDirection: 'row', gap: 12 },
  link: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  linkDanger: { color: '#EF4444' },
  list: { padding: 12, paddingBottom: 32, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EEF2F7',
  },
  cardUnread: { borderColor: COLORS.primary, backgroundColor: '#F8FBFF' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardMsg: { fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  cardActions: { gap: 8, alignItems: 'center', justifyContent: 'center' },
  cardArrow: { fontSize: 22, color: '#C7C7CC', fontWeight: '300' },
  deleteBtn: { padding: 4 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  errorBox: { margin: 24, padding: 24, backgroundColor: '#FFFBEB', borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FDE68A' },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  errorSub: { fontSize: 12, color: '#B45309' },
});
