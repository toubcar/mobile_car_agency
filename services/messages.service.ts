import apiClient from './api';

export interface ChatMessage {
  id: number;
  message: string;
  message_type?: 'text' | 'image' | 'document';
  sender_id: number;
  sender_type: string;
  sender_class?: string;
  is_read: boolean;
  read_at?: string;
  created_at?: string;
  rental_id?: number;
  support_ticket_id?: number;
}

export type ConversationAgency = {
  id: number;
  name: string;
  city?: string;
  phone?: string;
};

export type ConversationCar = {
  id: number;
  name: string;
};

export interface InboxConversation {
  id: number;
  type: 'rental' | 'support';
  peer_type?: 'client' | 'agency' | null;
  title: string;
  subtitle: string;
  status: string;
  unread_count: number;
  agency?: ConversationAgency | null;
  car?: ConversationCar | null;
  last_message?: ChatMessage | { id?: number; message?: string; sender_type?: string; created_at?: string } | null;
  last_activity?: string;
}

export type RentalMessage = ChatMessage;
export type RentalConversation = InboxConversation;

function normalizeMessage(raw: unknown): ChatMessage {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: Number(m.id) || 0,
    rental_id: m.rental_id != null ? Number(m.rental_id) : undefined,
    support_ticket_id: m.support_ticket_id != null ? Number(m.support_ticket_id) : undefined,
    sender_id: Number(m.sender_id) || 0,
    sender_type: String(m.sender_type ?? ''),
    sender_class: m.sender_class != null ? String(m.sender_class) : undefined,
    message: String(m.message ?? ''),
    message_type: (m.message_type as ChatMessage['message_type']) ?? 'text',
    is_read: Boolean(m.is_read),
    read_at: m.read_at != null ? String(m.read_at) : undefined,
    created_at: m.created_at != null ? String(m.created_at) : undefined,
  };
}

function normalizeAgency(raw: unknown): ConversationAgency | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const id = Number(a.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    name: String(a.name ?? ''),
    city: a.city != null ? String(a.city) : undefined,
    phone: a.phone != null ? String(a.phone) : undefined,
  };
}

function normalizeCar(raw: unknown): ConversationCar | null {
  if (!raw || typeof raw !== 'object') return null;
  const car = raw as Record<string, unknown>;
  const id = Number(car.id);
  if (!Number.isFinite(id)) return null;
  return { id, name: String(car.name ?? '') };
}

function normalizeConversation(raw: unknown): InboxConversation {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const last = c.last_message;
  return {
    id: Number(c.id) || 0,
    type: c.type === 'support' ? 'support' : 'rental',
    peer_type: c.peer_type === 'client' || c.peer_type === 'agency' ? c.peer_type : null,
    title: String(c.title ?? ''),
    subtitle: String(c.subtitle ?? ''),
    status: String(c.status ?? ''),
    unread_count: Number(c.unread_count) || 0,
    agency: normalizeAgency(c.agency),
    car: normalizeCar(c.car),
    last_message:
      last && typeof last === 'object'
        ? 'sender_class' in (last as object) || 'sender_type' in (last as object)
          ? normalizeMessage(last)
          : (last as InboxConversation['last_message'])
        : null,
    last_activity: c.last_activity != null ? String(c.last_activity) : undefined,
  };
}

export const messagesService = {
  async conversations(): Promise<InboxConversation[]> {
    const { data } = await apiClient.get<{ data: unknown[] }>('/messages/conversations');
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows.map(normalizeConversation);
  },

  async showRental(rentalId: number): Promise<{ conversation: InboxConversation; messages: ChatMessage[] }> {
    const { data } = await apiClient.get<{ data: { conversation: unknown; messages: unknown[] } }>(
      `/messages/rentals/${rentalId}`,
    );
    return {
      conversation: normalizeConversation(data.data.conversation),
      messages: (data.data.messages ?? []).map(normalizeMessage),
    };
  },

  async showSupport(ticketId: number): Promise<{ conversation: InboxConversation; messages: ChatMessage[] }> {
    const { data } = await apiClient.get<{ data: { conversation: unknown; messages: unknown[] } }>(
      `/messages/support/${ticketId}`,
    );
    return {
      conversation: normalizeConversation(data.data.conversation),
      messages: (data.data.messages ?? []).map(normalizeMessage),
    };
  },

  async sendRental(rentalId: number, payload: { message: string; message_type?: ChatMessage['message_type'] }): Promise<ChatMessage> {
    const { data } = await apiClient.post<{ data: unknown }>(`/messages/rentals/${rentalId}`, payload);
    return normalizeMessage(data.data);
  },

  async sendSupport(ticketId: number, payload: { message: string }): Promise<ChatMessage> {
    const { data } = await apiClient.post<{ data: unknown }>(`/messages/support/${ticketId}`, payload);
    return normalizeMessage(data.data);
  },

  async markAsRead(id: number): Promise<ChatMessage> {
    const { data } = await apiClient.patch<{ data: unknown }>(`/messages/${id}/read`);
    return normalizeMessage(data.data);
  },

  /** @deprecated use showRental */
  async show(rentalId: number) {
    return this.showRental(rentalId);
  },

  /** @deprecated use sendRental */
  async send(rentalId: number, payload: { message: string; message_type?: ChatMessage['message_type'] }) {
    return this.sendRental(rentalId, payload);
  },
};
