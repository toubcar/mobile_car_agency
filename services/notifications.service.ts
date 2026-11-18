import apiClient from './api';

export interface BackofficeNotification {
  id: number;
  title: string;
  message?: string;
  category?: string;
  priority?: string;
  type?: string;
  icon?: string;
  icon_color?: string;
  action_url?: string;
  related_id?: number;
  is_read: boolean;
  read_at?: string;
  created_at?: string;
  time_ago?: string;
}

export interface NotificationsResult {
  data: BackofficeNotification[];
  statistics: {
    total: number;
    unread: number;
    support: number;
    reservation: number;
    payment: number;
    agency: number;
  };
}

const EMPTY_STATS: NotificationsResult['statistics'] = {
  total: 0,
  unread: 0,
  support: 0,
  reservation: 0,
  payment: 0,
  agency: 0,
};

function normalizeList(body: unknown): NotificationsResult {
  if (body == null || typeof body !== 'object') {
    return { data: [], statistics: EMPTY_STATS };
  }
  const o = body as Record<string, unknown>;
  const payload = o.data;
  let items: BackofficeNotification[] = [];
  if (Array.isArray(payload)) {
    items = payload as BackofficeNotification[];
  } else if (payload && typeof payload === 'object') {
    const nested = (payload as Record<string, unknown>).data;
    if (Array.isArray(nested)) items = nested as BackofficeNotification[];
  }
  const rawStats = (o.statistics ?? {}) as Partial<NotificationsResult['statistics']>;
  return {
    data: items,
    statistics: {
      total: Number(rawStats.total) || items.length,
      unread: Number(rawStats.unread) ?? items.filter((n) => !n.is_read).length,
      support: Number(rawStats.support) || 0,
      reservation: Number(rawStats.reservation) || 0,
      payment: Number(rawStats.payment) || 0,
      agency: Number(rawStats.agency) || 0,
    },
  };
}

export const notificationsService = {
  async list(params?: { category?: string; read?: 'all' | 'read' | 'unread'; limit?: number }): Promise<NotificationsResult> {
    const { data } = await apiClient.get('/notifications', { params });
    return normalizeList(data);
  },

  async markAsRead(id: number): Promise<BackofficeNotification> {
    const { data } = await apiClient.patch<{ data: BackofficeNotification }>(`/notifications/${id}/read`);
    return data.data;
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async clearAll(): Promise<void> {
    await apiClient.delete('/notifications/clear');
  },
};
