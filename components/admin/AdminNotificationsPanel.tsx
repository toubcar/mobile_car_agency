import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import {
  notificationsService,
  type BackofficeNotification,
  type NotificationsResult,
} from '@/services/notifications.service';
import {
  resolveFallbackAlertRoute,
  resolveNotificationRoute,
} from '@/utils/notificationNavigation';

import { t } from '@/i18n';

const SCREEN_H = Dimensions.get('window').height;
const PANEL_WIDTH = Math.min(360, Dimensions.get('window').width - 32);
const SCROLL_AFTER = 4;

/** Hauteur approximative d'une ligne notification */
const ITEM_HEIGHT = 76;
const HEADER_HEIGHT = 52;
const STATS_HEIGHT = 36;
const EMPTY_HEIGHT = 120;
const LOADER_HEIGHT = 100;

type ListItem = BackofficeNotification | {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: () => void;
  fallbackAlerts?: string[];
}

function patchUnreadBadge(
  queryClient: ReturnType<typeof useQueryClient>,
  delta: number,
) {
  queryClient.setQueryData<NotificationsResult>(['notifications', 'unread-badge'], (old) => {
    if (!old?.statistics) return old;
    const next = Math.max(0, (old.statistics.unread ?? 0) + delta);
    return {
      ...old,
      statistics: { ...old.statistics, unread: next },
    };
  });
}

function categoryIcon(category?: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (category) {
    case 'reservation': return 'calendar-outline';
    case 'payment': return 'wallet-outline';
    case 'support': return 'headset-outline';
    case 'agency': return 'business-outline';
    default: return 'notifications-outline';
  }
}

function NotificationRow({
  item,
  onPress,
}: {
  item: ListItem;
  onPress: () => void;
}) {
  const isFallback = String(item.id).startsWith('fallback-');
  const canNavigate = isFallback || ('category' in item);
  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      activeOpacity={canNavigate ? 0.75 : 1}
      onPress={onPress}
    >
      <View style={[styles.itemIcon, !item.is_read && styles.itemIconUnread]}>
        <Ionicons
          name={categoryIcon('category' in item ? item.category : undefined)}
          size={18}
          color={item.is_read ? '#9CA3AF' : COLORS.primary}
        />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        {item.message ? (
          <Text style={styles.itemMsg} numberOfLines={2}>{item.message}</Text>
        ) : null}
        {'time_ago' in item && item.time_ago ? (
          <Text style={styles.itemTime}>{item.time_ago}</Text>
        ) : null}
      </View>
      <Text style={styles.itemArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function AdminNotificationsPanel({ visible, onClose, onUnreadChange, fallbackAlerts = [] }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', 'panel'],
    queryFn: () => notificationsService.list({ limit: 30 }),
    enabled: visible,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<NotificationsResult>(['notifications', 'panel'], (old) => {
        if (!old) return old;
        const wasUnread = old.data.some((n) => n.id === id && !n.is_read);
        if (!wasUnread) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
          statistics: {
            ...old.statistics,
            unread: Math.max(0, (old.statistics.unread ?? 0) - 1),
          },
        };
      });
      patchUnreadBadge(queryClient, -1);
      onUnreadChange?.();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResult>(['notifications', 'panel'], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => ({ ...n, is_read: true })),
          statistics: { ...old.statistics, unread: 0 },
        };
      });
      queryClient.setQueryData<NotificationsResult>(['notifications', 'unread-badge'], (old) => {
        if (!old?.statistics) return old;
        return { ...old, statistics: { ...old.statistics, unread: 0 } };
      });
      onUnreadChange?.();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = data?.data ?? [];
  const stats = data?.statistics;
  const unread = stats?.unread ?? items.filter((n) => !n.is_read).length;
  const useFallback = isError && items.length === 0 && fallbackAlerts.length > 0;

  const listData: ListItem[] = useMemo(
    () =>
      useFallback
        ? fallbackAlerts.map((alert, i) => ({
            id: `fallback-${i}`,
            title: alert,
            message: t('Alerte plateforme'),
            is_read: false,
          }))
        : items,
    [useFallback, fallbackAlerts, items],
  );

  const layout = useMemo(() => {
    const count = listData.length;
    const showStats = !useFallback && !!stats;
    const chromeH = HEADER_HEIGHT + (showStats ? STATS_HEIGHT : 0) + (useFallback ? 28 : 0);

    if (isLoading && count === 0) {
      return { listHeight: LOADER_HEIGHT, needsScroll: false, panelMaxH: chromeH + LOADER_HEIGHT };
    }
    if (isError && !useFallback && count === 0) {
      return { listHeight: EMPTY_HEIGHT, needsScroll: false, panelMaxH: chromeH + EMPTY_HEIGHT };
    }
    if (count === 0) {
      return { listHeight: EMPTY_HEIGHT, needsScroll: false, panelMaxH: chromeH + EMPTY_HEIGHT };
    }

    const needsScroll = count > SCROLL_AFTER;
    const listHeight = needsScroll
      ? ITEM_HEIGHT * SCROLL_AFTER
      : count * ITEM_HEIGHT;

    const panelMaxH = Math.min(chromeH + listHeight, SCREEN_H * 0.72);

    return { listHeight, needsScroll, panelMaxH, count };
  }, [listData.length, useFallback, stats, isLoading, isError]);

  const handleItemPress = (item: ListItem) => {
    const isFallback = String(item.id).startsWith('fallback-');

    if (!isFallback && typeof item.id === 'number') {
      const notif = item as BackofficeNotification;
      if (!notif.is_read) {
        markRead.mutate(notif.id);
      }
      const route = resolveNotificationRoute(notif, 'admin');
      onClose();
      if (route) {
        setTimeout(() => router.push(route as any), 200);
      }
      return;
    }

    if (isFallback && 'title' in item) {
      const route = resolveFallbackAlertRoute(item.title, 'admin');
      onClose();
      setTimeout(() => router.push(route as any), 200);
    }
  };

  if (!visible) return null;

  const renderList = () => {
    if (isLoading && listData.length === 0) {
      return (
        <View style={[styles.centerBox, { height: LOADER_HEIGHT }]}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }

    if (isError && !useFallback) {
      return (
        <TouchableOpacity
          style={[styles.errorBox, { height: EMPTY_HEIGHT }]}
          onPress={() => refetch()}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-offline-outline" size={24} color="#B45309" />
          <Text style={styles.errorTitle}>{t('Chargement impossible')}</Text>
          <Text style={styles.errorSub}>{t('Appuyez pour réessayer')}</Text>
        </TouchableOpacity>
      );
    }

    if (listData.length === 0) {
      return (
        <View style={[styles.centerBox, { height: EMPTY_HEIGHT }]}>
          <Ionicons name="notifications-off-outline" size={36} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('Aucune notification')}</Text>
        </View>
      );
    }

    if (layout.needsScroll) {
      return (
        <View>
          <FlatList
            data={listData}
            keyExtractor={(item) => String(item.id)}
            style={{ height: layout.listHeight }}
            contentContainerStyle={styles.listContent}
            scrollEnabled
            nestedScrollEnabled
            showsVerticalScrollIndicator
            indicatorStyle="black"
            bounces
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={() => handleItemPress(item)} />
            )}
          />
          <View style={styles.scrollHint}>
            <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
            <Text style={styles.scrollHintText}>
              {layout.count! - SCROLL_AFTER} {t('de plus — faites défiler')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView
        scrollEnabled={false}
        style={{ maxHeight: layout.listHeight }}
        contentContainerStyle={styles.listContent}
      >
        {listData.map((item) => (
          <NotificationRow
            key={String(item.id)}
            item={item}
            onPress={() => handleItemPress(item)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[styles.anchor, { top: insets.top + 52, right: 16, width: PANEL_WIDTH }]}
        pointerEvents="box-none"
      >
        <View style={[styles.panel, { maxHeight: layout.panelMaxH }]}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <Ionicons name="notifications" size={20} color={COLORS.primary} />
              <Text style={styles.panelTitle}>{t('Notifications')}</Text>
              {unread > 0 && (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadPillText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {!useFallback && stats ? (
            <View style={styles.statsRow}>
              <Text style={styles.statsTxt}>{stats.unread} {t('non lues ·')} {stats.total} total</Text>
              {stats.unread > 0 && (
                <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
                  <Text style={styles.link}>{t('Tout lire')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {renderList()}

          {useFallback ? (
            <Text style={styles.fallbackHint}>{t('Alertes synthèse — API notifications indisponible')}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  anchor: {
    position: 'absolute',
    alignSelf: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    minHeight: HEADER_HEIGHT,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  panelTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  unreadPill: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadPillText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  closeBtn: { padding: 4 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    minHeight: STATS_HEIGHT,
  },
  statsTxt: { fontSize: 12, color: '#6B7280' },
  link: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  listContent: { flexGrow: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: ITEM_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  itemUnread: { backgroundColor: '#F8FBFF' },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconUnread: { backgroundColor: '#EBF5FB' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  itemMsg: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  itemTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  itemArrow: { fontSize: 18, color: '#C7C7CC', marginTop: 4, fontWeight: '300' },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  scrollHintText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  centerBox: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  errorBox: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  errorSub: { fontSize: 11, color: '#B45309' },
  fallbackHint: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
});
