import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/api';
import type { Booking } from '@/types';
import { formatMoney } from '@/utils/money';
import { rentalDays } from '@/utils/rental';
import { daysLabel } from '@/components/BookingDateRangePicker';
import { t, jsLocale } from '@/i18n';

type Step = 'reason' | 'mistake' | 'retain' | 'confirm';
type ReasonId = 'mistake' | 'plans' | 'other_car' | 'agency' | 'other';

const REASONS: {
  id: ReasonId;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'mistake',
    icon: 'create-outline',
    get title() { return t('Erreur sur les dates ou le véhicule'); },
    get subtitle() { return t('Une information n’est pas correcte'); },
  },
  {
    id: 'plans',
    icon: 'airplane-outline',
    get title() { return t('Mes plans ont changé'); },
    get subtitle() { return t('Je ne pourrai pas voyager à ces dates'); },
  },
  {
    id: 'other_car',
    icon: 'car-outline',
    get title() { return t('J’ai trouvé une autre option'); },
    get subtitle() { return t('Un autre véhicule ou une autre offre'); },
  },
  {
    id: 'agency',
    icon: 'chatbubbles-outline',
    get title() { return t('Problème avec l’agence'); },
    get subtitle() { return t('Réponse, disponibilité ou communication'); },
  },
  {
    id: 'other',
    icon: 'ellipsis-horizontal-circle-outline',
    get title() { return t('Autre raison'); },
    get subtitle() { return t('Je préfère annuler pour l’instant'); },
  },
];

type Props = {
  visible: boolean;
  booking: Booking;
  onClose: () => void;
  onConfirmCancel: () => void;
  isCancelling: boolean;
  /** Paid online: the cancellation policy says nothing is refunded, the customer is told before confirming */
  paidOnline?: boolean;
};

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString(jsLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BookingCancellationFlow({
  visible,
  booking,
  onClose,
  onConfirmCancel,
  isCancelling,
  paidOnline = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<ReasonId | null>(null);

  const carLabel =
    booking.car?.name ||
    [booking.car?.brand, booking.car?.model].filter(Boolean).join(' ') ||
    t('Véhicule');
  const days = rentalDays(booking.start_date, booking.end_date);

  const reset = () => {
    setStep('reason');
    setReason(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickReason = (id: ReasonId) => {
    setReason(id);
    if (id === 'mistake') setStep('mistake');
    else setStep('retain');
  };

  const goModify = () => {
    handleClose();
    router.push({
      pathname: '/booking/create',
      params: { carId: String(booking.car.id) },
    });
  };

  const goMessages = () => {
    handleClose();
    router.push(`/messages/${booking.id}`);
  };

  const stepIndex = useMemo(() => {
    if (step === 'reason') return 0;
    if (step === 'mistake' || step === 'retain') return 1;
    return 2;
  }, [step]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.progressDot, i <= stepIndex && styles.progressDotOn]} />
            ))}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.tripCard}>
            <View style={styles.tripIcon}>
              <Ionicons name="car-sport" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle} numberOfLines={1}>{carLabel}</Text>
              <Text style={styles.tripMeta}>
                {fmtShort(booking.start_date)} → {fmtShort(booking.end_date)}
                {days > 0 ? ` · ${daysLabel(days)}` : ''}
              </Text>
              <Text style={styles.tripPrice}>{formatMoney(booking.total_price)}</Text>
            </View>
          </View>

          {step === 'reason' ? (
            <>
              <Text style={styles.headline}>{t('Qu’est-ce qui vous amène ici ?')}</Text>
              <Text style={styles.lead}>
                {t('On veut vous aider à trouver la meilleure solution avant toute annulation.')}
              </Text>
              {REASONS.map((r) => (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [styles.reasonCard, pressed && styles.reasonCardPressed]}
                  onPress={() => pickReason(r.id)}
                >
                  <View style={styles.reasonIcon}>
                    <Ionicons name={r.icon} size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.reasonBody}>
                    <Text style={styles.reasonTitle}>{r.title}</Text>
                    <Text style={styles.reasonSub}>{r.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </>
          ) : null}

          {step === 'mistake' ? (
            <>
              <Text style={styles.headline}>{t('Pas besoin d’annuler tout de suite')}</Text>
              <Text style={styles.lead}>
                {t('Si vous vous êtes trompé sur les dates ou le véhicule, vous pouvez corriger sans perdre votre réservation actuelle en en créant une nouvelle avec les bonnes informations, puis annuler l’ancienne si besoin.')}
              </Text>
              <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={18} color="#B45309" />
                <Text style={styles.tipText}>
                  {t('L’agence peut aussi ajuster votre réservation par message — souvent plus rapide qu’une annulation.')}
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={goModify} activeOpacity={0.88}>
                <Ionicons name="calendar-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnTxt}>{t('Réserver avec les bonnes dates')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={goMessages} activeOpacity={0.88}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryBtnTxt}>{t('Demander une modification à l’agence')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostDanger} onPress={() => setStep('confirm')} activeOpacity={0.7}>
                <Text style={styles.ghostDangerTxt}>{t('Je préfère annuler quand même')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep('reason')}>
                <Text style={styles.backLinkTxt}>{t('← Choisir une autre raison')}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === 'retain' ? (
            <>
              <Text style={styles.headline}>{t('On peut peut-être arranger ça')}</Text>
              <Text style={styles.lead}>
                {t('Avant d’annuler, voici des options qui résolvent souvent le problème sans repartir de zéro.')}
              </Text>
              <View style={styles.optionList}>
                <View style={styles.optionRow}>
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.optionTxt}>{t('Échanger avec l’agence pour trouver un créneau ou un véhicule adapté')}</Text>
                </View>
                <View style={styles.optionRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.optionTxt}>{t('Garder votre réservation le temps de confirmer une alternative')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={goMessages} activeOpacity={0.88}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnTxt}>{t('Contacter l’agence')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('confirm')} activeOpacity={0.88}>
                <Text style={styles.secondaryBtnTxt}>{t('Continuer vers l’annulation')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep('reason')}>
                <Text style={styles.backLinkTxt}>{t('← Choisir une autre raison')}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === 'confirm' ? (
            <>
              <Text style={styles.headline}>{t('Confirmer l’annulation')}</Text>
              <Text style={styles.lead}>
                {paidOnline
                  ? t('Comme prévu par la politique d\'annulation, le montant payé ne sera pas remboursé.')
                  : t('Votre réservation sera annulée et le véhicule libéré pour d\'autres clients.')}
              </Text>
              {paidOnline ? (
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => {
                    handleClose();
                    router.push('/pages/annulation' as never);
                  }}
                >
                  <Text style={styles.policyLinkTxt}>{t('Lire la politique d\'annulation')}</Text>
                </TouchableOpacity>
              ) : null}
              {reason ? (
                <View style={styles.reasonPill}>
                  <Text style={styles.reasonPillTxt}>
                    {t('Motif : :reason', { reason: REASONS.find((r) => r.id === reason)?.title ?? '—' })}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.dangerBtn, isCancelling && styles.dangerBtnDisabled]}
                onPress={onConfirmCancel}
                disabled={isCancelling}
                activeOpacity={0.88}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.dangerBtnTxt}>{t('Annuler définitivement ma réservation')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setStep(reason === 'mistake' ? 'mistake' : 'retain')}
                disabled={isCancelling}
              >
                <Text style={styles.backLinkTxt}>{t('← Revenir en arrière')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  policyLinkTxt: { fontSize: 14, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  progressDotOn: { backgroundColor: COLORS.primary },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  tripCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  tripMeta: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  tripPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 6 },
  headline: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  lead: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 18 },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonCardPressed: { backgroundColor: '#F9FAFB' },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBody: { flex: 1 },
  reasonTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  reasonSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  tipBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  primaryBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryBtnTxt: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  ghostDanger: { alignItems: 'center', paddingVertical: 12 },
  ghostDangerTxt: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  optionList: { gap: 12, marginBottom: 18 },
  optionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  optionTxt: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  reasonPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  reasonPillTxt: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  dangerBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  dangerBtnDisabled: { opacity: 0.6 },
  dangerBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  backLink: { alignItems: 'center', paddingVertical: 10 },
  backLinkTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});
