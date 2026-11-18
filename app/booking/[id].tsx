import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { bookingsService } from '@/services/bookings.service';
import { useAuthStore } from '@/store/authStore';
import type { Booking } from '@/types';
import { formatMoney } from '@/utils/money';
import { rentalDays } from '@/utils/rental';
import { minutesLeftToPay, payBooking } from '@/utils/payments';
import { openInBrowser } from '@/utils/openLink';
import { serverMessage } from '@/utils/apiError';
import { daysLabel } from '@/components/BookingDateRangePicker';
import { Button, Field, Sheet } from '@/components/backoffice/ui';

import { t, jsLocale, dirIcon } from '@/i18n';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

const STATUS_MAP: Record<Booking['status'], { label: string; bg: string; text: string }> = {
  pending:   { get label() { return t('En attente'); },  bg: '#FEF3C7', text: '#92400E' },
  confirmed: { get label() { return t('Confirmée'); },   bg: '#D1FAE5', text: '#065F46' },
  completed: { get label() { return t('Terminée'); },    bg: '#DBEAFE', text: '#1E40AF' },
  cancelled: { get label() { return t('Annulée'); },     bg: '#FEE2E2', text: '#991B1B' },
};

const TRANSITIONS: Record<Booking['status'], { next: Booking['status']; label: string; color: string }[]> = {
  pending:   [{ next: 'confirmed', get label() { return t('Confirmer'); }, color: '#10B981' }, { next: 'cancelled', get label() { return t('Annuler'); }, color: '#FF3B30' }],
  confirmed: [{ next: 'completed', get label() { return t('Marquer terminée'); }, color: COLORS.primary }, { next: 'cancelled', get label() { return t('Annuler'); }, color: '#FF3B30' }],
  completed: [],
  cancelled: [],
};

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={16} color={COLORS.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function fmtFull(d: string) {
  return new Date(d).toLocaleDateString(jsLocale(), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function BookingDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const role              = useAuthStore((s) => s.role);
  const user                = useAuthStore((s) => s.user);
  const isAuthenticated     = useAuthStore((s) => s.isAuthenticated);

  const canManage = role === 'admin' || role === 'agence';
  const isClient = isAuthenticated && !canManage;

  const [paying, setPaying] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [now, setNow] = useState(Date.now());

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancelBooking(Number(id)),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      Alert.alert(t('Annulée'), message ?? t('Réservation annulée.'));
      router.back();
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Impossible d’annuler.'))),
  });

  const reviewMutation = useMutation({
    mutationFn: () => bookingsService.review(Number(id), {
      rating,
      title: reviewTitle.trim() || undefined,
      comment: reviewComment.trim() || undefined,
    }),
    onSuccess: (result) => {
      setReviewOpen(false);
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert(t('Merci !'), result.message);
    },
    onError: (err) => Alert.alert(t('Avis impossible'), serverMessage(err, t('Réessayez dans un instant.'))),
  });

  const invoiceMutation = useMutation({
    mutationFn: () => bookingsService.invoiceLink(Number(id)),
    onSuccess: (url) => void openInBrowser(url),
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('La facture n\'a pas pu être ouverte.'))),
  });

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', id, role, user?.id],
    queryFn: () =>
      canManage
        ? bookingsService.getById(Number(id))
        : bookingsService.getBooking(Number(id), user ?? undefined),
    enabled: !!id && (canManage || isAuthenticated),
  });

  const statusMutation = useMutation({
    mutationFn: (status: Booking['status']) => bookingsService.updateStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['agence-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent'] });
      queryClient.invalidateQueries({ queryKey: ['agence-recent'] });
    },
    onError: () => Alert.alert(t('Erreur'), t('Impossible de mettre à jour le statut.')),
  });

  // the 15 minutes left to pay, kept up to date while the screen is open
  useEffect(() => {
    if (!booking?.can_pay) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [booking?.can_pay]);

  const pay = async () => {
    setPaying(true);
    const outcome = await payBooking(Number(id)).catch(() => 'failed' as const);
    setPaying(false);
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    if (outcome === 'paid') {
      Alert.alert(t('Paiement réussi'), t('Votre réservation est confirmée.'));
    } else if (outcome === 'failed') {
      Alert.alert(t('Le paiement n\'a pas abouti'), t('Aucun montant n\'a été débité. Vous pouvez réessayer.'));
    }
  };

  const confirmCancel = () => {
    const paidOnline = booking?.status === 'confirmed' && booking.payment_status === 'paid';
    Alert.alert(
      t('Annuler la réservation'),
      paidOnline
        ? t('Comme prévu par la politique d\'annulation, le montant payé ne sera pas remboursé. Annuler quand même ?')
        : t('Confirmer l’annulation ?'),
      [
        { text: t('Non'), style: 'cancel' },
        ...(paidOnline ? [{ text: t('Voir la politique'), onPress: () => router.push('/pages/annulation' as never) }] : []),
        { text: t('Oui, annuler'), style: 'destructive' as const, onPress: () => cancelMutation.mutate() },
      ],
    );
  };

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  const sc          = STATUS_MAP[booking.status];
  const transitions = canManage ? (TRANSITIONS[booking.status] ?? []) : [];
  const nights = rentalDays(booking.start_date, booking.end_date);
  const minutesLeft = minutesLeftToPay(booking.pay_before, now);
  const canPay = isClient && booking.can_pay === true && minutesLeft > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name={dirIcon('chevron-back')} size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Réservation #')}{booking.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusTxt, { color: sc.text }]}>{(isClient && booking.status_label) || sc.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {canManage ? (
          <>
            <Text style={styles.section}>{t('Client')}</Text>
            <View style={styles.card}>
              <View style={styles.clientRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{booking.user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{booking.user.name}</Text>
                  <Text style={styles.clientEmail}>{booking.user.email}</Text>
                </View>
                {booking.user.phone ? (
                  <View style={styles.phoneChip}>
                    <Ionicons name="call-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.phoneTxt}>{booking.user.phone}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        {/* Vehicle */}
        <Text style={styles.section}>{t('Véhicule')}</Text>
        <View style={styles.card}>
          <InfoRow icon="car-outline"      label={t('Modèle')}       value={`${booking.car.brand} ${booking.car.model} (${booking.car.year})`} />
          <View style={styles.divider} />
          <InfoRow icon="pricetag-outline" label={t('Catégorie')}    value={booking.car.category} />
          {booking.car.location && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="location-outline" label={t('Localisation')} value={booking.car.location} />
            </>
          )}
        </View>

        {/* Dates */}
        <Text style={styles.section}>{t('Période')}</Text>
        <View style={styles.card}>
          <InfoRow icon="log-in-outline"  label={t('Début')} value={fmtFull(booking.start_date)} />
          <View style={styles.divider} />
          <InfoRow icon="log-out-outline" label={t('Fin')}   value={fmtFull(booking.end_date)} />
          <View style={styles.divider} />
          <InfoRow icon="moon-outline"    label={t('Durée')} value={nights > 0 ? daysLabel(nights) : '—'} />
        </View>

        {/* Payment */}
        <Text style={styles.section}>{t('Paiement')}</Text>
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>{t('Montant total')}</Text>
              <Text style={styles.priceValue}>{formatMoney(booking.total_price)}</Text>
            </View>
            <View style={[styles.payBadge, { backgroundColor: booking.payment_status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Ionicons name={booking.payment_status === 'paid' ? 'checkmark-circle' : 'time'} size={13} color={booking.payment_status === 'paid' ? '#065F46' : '#92400E'} />
              <Text style={[styles.payBadgeTxt, { color: booking.payment_status === 'paid' ? '#065F46' : '#92400E' }]}>
                {booking.payment_status === 'paid' ? t('Payé') : booking.payment_status === 'refunded' ? t('Remboursé') : t('Non payé')}
              </Text>
            </View>
          </View>
          {canPay ? (
            <View style={styles.payBox}>
              <Text style={styles.payHint}>
                {t('Le véhicule vous est gardé encore :minutes min : payez pour confirmer la réservation.', { minutes: minutesLeft })}
              </Text>
              <Button label={t('Payer maintenant')} icon="card-outline" onPress={() => void pay()} loading={paying} />
              <Text style={styles.payNote}>{t('Paiement sécurisé par PayPal — aucun compte PayPal n\'est nécessaire.')}</Text>
            </View>
          ) : null}
          {isClient && booking.status === 'pending' && !canPay ? (
            <Text style={styles.payExpired}>{t('Le délai de paiement est dépassé : le véhicule n\'est plus réservé pour vous.')}</Text>
          ) : null}
          {canManage && role === 'agence' && (booking.status === 'confirmed' || booking.status === 'completed') ? (
            <View style={styles.payBox}>
              <Button
                label={t('Facture')}
                icon="document-text-outline"
                variant="secondary"
                onPress={() => invoiceMutation.mutate()}
                loading={invoiceMutation.isPending}
              />
            </View>
          ) : null}
        </View>

        {isClient && (booking.review || booking.can_review) ? (
          <>
            <Text style={styles.section}>{t('Votre avis')}</Text>
            <View style={[styles.card, styles.reviewCard]}>
              {booking.review ? (
                <>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= booking.review!.rating ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
                    ))}
                  </View>
                  {booking.review.title ? <Text style={styles.reviewTitle}>{booking.review.title}</Text> : null}
                  {booking.review.comment ? <Text style={styles.reviewText}>{booking.review.comment}</Text> : null}
                  {booking.review.agency_reply ? (
                    <View style={styles.agencyReply}>
                      <Text style={styles.agencyReplyLabel}>{t('Réponse de l\'agence')}</Text>
                      <Text style={styles.reviewText}>{booking.review.agency_reply}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.reviewText}>{t('Votre location est terminée : dites aux autres clients comment elle s\'est passée.')}</Text>
                  <Button label={t('Donner mon avis')} icon="star-outline" onPress={() => setReviewOpen(true)} />
                </>
              )}
            </View>
          </>
        ) : null}

        {isClient && booking.can_cancel ? (
          <>
            <Text style={styles.section}>{t('Actions')}</Text>
            <View style={styles.actionsWrap}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/messages/${booking.id}`)}
              >
                <Text style={[styles.actionBtnTxt, { color: COLORS.primary }]}>{t('Contacter l’agence')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#FF3B30' }]}
                onPress={confirmCancel}
                disabled={cancelMutation.isPending}
              >
                <Text style={[styles.actionBtnTxt, { color: '#FF3B30' }]}>{t('Annuler la réservation')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* Actions (admin/agence only) */}
        {transitions.length > 0 && (
          <>
            <Text style={styles.section}>{t('Actions')}</Text>
            <View style={styles.actionsWrap}>
              {transitions.map((step) => (
                <TouchableOpacity
                  key={step.next}
                  style={[styles.actionBtn, { borderColor: step.color }, statusMutation.isPending && styles.actionBtnDisabled]}
                  onPress={() =>
                    Alert.alert(t('Confirmer'), t("Changer en \":label\" ?", { label: step.label }), [
                      { text: t('Annuler'), style: 'cancel' },
                      { text: step.label, onPress: () => statusMutation.mutate(step.next) },
                    ])
                  }
                  activeOpacity={0.8}
                  disabled={statusMutation.isPending}
                >
                  <Text style={[styles.actionBtnTxt, { color: step.color }]}>{step.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Sheet
        visible={reviewOpen}
        title={t('Votre avis sur cette location')}
        onClose={() => setReviewOpen(false)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setReviewOpen(false)} style={{ flex: 1 }} />
            <Button label={t('Publier')} onPress={() => reviewMutation.mutate()} loading={reviewMutation.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        <View style={styles.pickStars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={t(':count sur 5', { count: n })}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color="#F59E0B" />
            </TouchableOpacity>
          ))}
        </View>
        <Field label={t('Titre (facultatif)')} value={reviewTitle} onChangeText={setReviewTitle} maxLength={120} />
        <Field
          label={t('Votre avis')}
          value={reviewComment}
          onChangeText={setReviewComment}
          multiline
          maxLength={1000}
          placeholder={t('Racontez votre location (facultatif)')}
          hint={t('Votre avis est publié aussitôt ; l\'agence peut y répondre.')}
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F2F2F7' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },

  scroll:  { paddingHorizontal: 16, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: '600', color: '#6D6D72', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4 },

  card:   { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', ...SHADOW },
  divider:{ height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0', marginLeft: 60 },

  clientRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  clientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clientEmail:{ fontSize: 13, color: '#8E8E93', marginTop: 2 },
  phoneChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EBF5FB', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  phoneTxt:   { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  infoRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 2, fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '600' },

  priceRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  priceLabel:  { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  priceValue:  { fontSize: 22, fontWeight: '700', color: '#111827' },
  payBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  payBadgeTxt: { fontSize: 12, fontWeight: '700' },

  payBox:      { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  payHint:     { fontSize: 13, color: '#92400E', lineHeight: 19 },
  payNote:     { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  payExpired:  { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, paddingBottom: 16, lineHeight: 19 },
  reviewCard:  { padding: 16, gap: 10 },
  starsRow:    { flexDirection: 'row', gap: 2 },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  reviewText:  { fontSize: 14, color: '#374151', lineHeight: 20 },
  agencyReply: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 10, gap: 4 },
  agencyReplyLabel: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, textTransform: 'uppercase' },
  pickStars:   { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },

  actionsWrap:      { gap: 10 },
  actionBtn:        { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, backgroundColor: '#FFF', ...SHADOW },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnTxt:     { fontSize: 15, fontWeight: '700' },
});
