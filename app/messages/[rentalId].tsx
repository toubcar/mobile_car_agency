import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { messagesService, type RentalMessage } from '@/services/messages.service';
import { carsService } from '@/services/cars.service';
import { COLORS } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';
import { isRentalMessagingOpen } from '@/utils/rentalMessaging';

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

  const conversation = data?.conversation;
  const messagingOpen =
    conversation?.messaging_open ?? isRentalMessagingOpen(conversation?.status ?? '');
  const agency = conversation?.agency;
  const car = conversation?.car;
  const carId = car?.id;

  const { data: carDetail } = useQuery({
    queryKey: ['car', carId, 'message-thread'],
    queryFn: () => carsService.getCar(carId!),
    enabled: Number.isFinite(carId) && !car?.image,
  });

  const carImage = car?.image ?? carDetail?.images?.[0];
  const carLabel = car?.name || carDetail?.name || conversation?.subtitle || 'Véhicule';

  const agencyName = agency?.name ?? conversation?.title ?? 'Conversation';
  const agencyAvatar = agency?.profile_picture;

  const sendMutation = useMutation({
    mutationFn: (message: string) => messagesService.sendRental(rid, { message }),
    onSuccess: () => {
      setText('');
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['messages', rid] });
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSendError(err?.response?.data?.message ?? 'Impossible d\'envoyer le message.');
    },
  });

  const messages = data?.messages ?? [];

  const openAgency = () => {
    if (agency?.id) router.push(`/agency/${agency.id}`);
  };

  const openCar = () => {
    if (carId) router.push(`/car/${carId}`);
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.contextBlock}>
        {agency ? (
          <TouchableOpacity
            style={styles.agencyCard}
            onPress={openAgency}
            activeOpacity={0.85}
            disabled={!agency.id}
          >
            {agencyAvatar ? (
              <Image source={{ uri: agencyAvatar }} style={styles.agencyAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.agencyAvatar, styles.avatarFallback]}>
                <Ionicons name="business" size={22} color={COLORS.secondary} />
              </View>
            )}
            <View style={styles.agencyBody}>
              <Text style={styles.agencyLabel}>Agence</Text>
              <Text style={styles.agencyName} numberOfLines={1}>{agencyName}</Text>
              {agency.city ? (
                <Text style={styles.agencyCity} numberOfLines={1}>{agency.city}</Text>
              ) : null}
            </View>
            {agency.id ? (
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            ) : null}
          </TouchableOpacity>
        ) : null}

        {carId ? (
          <TouchableOpacity style={styles.rentalCard} onPress={openCar} activeOpacity={0.88}>
            {carImage ? (
              <Image source={{ uri: carImage }} style={styles.rentalThumb} contentFit="cover" />
            ) : (
              <View style={[styles.rentalThumb, styles.avatarFallback]}>
                <Ionicons name="car-sport-outline" size={26} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.rentalBody}>
              <Text style={styles.rentalLabel}>Véhicule de la location</Text>
              <Text style={styles.rentalTitle} numberOfLines={2}>{carLabel}</Text>
              <Text style={styles.rentalLink}>Voir le détail du véhicule</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [agency, agencyAvatar, agencyName, carId, carImage, carLabel],
  );

  const renderItem = ({ item }: { item: RentalMessage }) => {
    const mine = item.sender_id === userId;
    return (
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.message}</Text>
          {item.created_at ? (
            <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
              {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
          <Text style={styles.headerTitle} numberOfLines={1}>Messages</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{agencyName}</Text>
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
            ListFooterComponent={listHeader}
            renderItem={renderItem}
          />
          {sendError && messagingOpen ? (
            <View style={styles.sendErrorBar}>
              <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
              <Text style={styles.sendErrorTxt}>{sendError}</Text>
            </View>
          ) : null}
          {messagingOpen ? (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Votre message…"
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
          ) : (
            <View style={styles.closedBar}>
              <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
              <Text style={styles.closedBarTxt}>
                Réservation terminée ou annulée — historique en lecture seule.
              </Text>
            </View>
          )}
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  list: { padding: 16, gap: 8, paddingBottom: 8 },
  contextBlock: { gap: 10, marginBottom: 16, marginTop: 4 },
  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agencyAvatar: { width: 52, height: 52, borderRadius: 14 },
  avatarFallback: {
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agencyBody: { flex: 1, minWidth: 0 },
  agencyLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  agencyName: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  agencyCity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rentalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6EAF8',
  },
  rentalThumb: { width: 72, height: 56, borderRadius: 12 },
  rentalBody: { flex: 1, minWidth: 0 },
  rentalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  rentalTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 },
  rentalLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
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
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  closedBarTxt: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '600', lineHeight: 18 },
});
