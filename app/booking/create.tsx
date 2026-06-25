import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/api';
import { carsService } from '@/services/cars.service';
import { bookingsService } from '@/services/bookings.service';
import { useAuthStore } from '@/store/authStore';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import PageHeader from '@/components/PageHeader';
import BookingDateRangePicker, { toIsoDate } from '@/components/BookingDateRangePicker';
import { formatMoney, formatMoneyPerDay } from '@/utils/money';
import { rentalDays } from '@/utils/rental';

function defaultStartDate(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function defaultEndDate(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 3);
  return d;
}

export default function CreateBookingScreen() {
  const { carId } = useLocalSearchParams<{ carId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const isCompact = screenW < 360;
  const contentPad = Math.max(14, Math.round(screenW * 0.04));
  const carImgSize = Math.min(Math.round(screenW * 0.28), 120);
  const footerBottomPad = insets.bottom + (isCompact ? 10 : 12);
  const scrollBottomPad = insets.bottom + (isCompact ? 108 : 100);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openAuthSheet } = useAuthSheet();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => defaultEndDate(defaultStartDate()));
  const [notes, setNotes] = useState('');
  const [successBooking, setSuccessBooking] = useState<{ id: number; total_price: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);
  const cid = Number(carId);
  const days = rentalDays(startIso, endIso);
  const canQuote = Number.isFinite(cid) && days >= 1;

  const minStart = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => carsService.getCar(cid),
    enabled: Number.isFinite(cid),
  });

  const {
    data: quote,
    isLoading: quoteLoading,
    isFetching: quoteFetching,
    error: quoteError,
  } = useQuery({
    queryKey: ['booking-quote', cid, startIso, endIso],
    queryFn: () => bookingsService.getQuote({ car_id: cid, start_date: startIso, end_date: endIso }),
    enabled: canQuote && isAuthenticated,
    retry: false,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingsService.createBooking(
        { car_id: cid, start_date: startIso, end_date: endIso },
        user ?? undefined,
      ),
    onSuccess: (booking) => {
      setSuccessBooking({ id: booking.id, total_price: booking.total_price });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMessage(err?.response?.data?.message ?? 'Impossible de créer la réservation.');
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <LinearGradient colors={['#C8E6F5', COLORS.background]} style={StyleSheet.absoluteFill} />
        <PageHeader title="Réserver" />
        <View style={styles.authCenter}>
          <View style={styles.authIcon}>
            <Ionicons name="lock-closed-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.authTitle}>Connexion requise</Text>
          <Text style={styles.authSub}>Connectez-vous pour finaliser votre réservation.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => openAuthSheet('login', carId ? `/booking/create?carId=${carId}` : undefined)}
          >
            <Text style={styles.primaryBtnTxt}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const quoteMessage =
    quoteError && typeof quoteError === 'object' && 'response' in quoteError
      ? (quoteError as { response?: { data?: { message?: string } } }).response?.data?.message
      : quoteError
        ? 'Devis indisponible pour ces dates.'
        : null;

  const carUnavailable = Boolean(car && !car.is_available);
  const bookingBlocked = carUnavailable || (!!quoteMessage && !quote && !quoteLoading);

  const submit = () => {
    if (bookingBlocked) return;
    if (days < 1) {
      setErrorMessage('La date de fin doit être après la date de début.');
      return;
    }
    if (!quote && !quoteLoading) {
      setErrorMessage(quoteMessage ?? 'Attendez le calcul du montant par le serveur.');
      return;
    }
    bookMutation.mutate();
  };

  const carImage = car?.images?.[0];
  const canSubmit = !!quote && !bookMutation.isPending && !bookingBlocked;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.headerGradient} />
      <PageHeader title="Réserver" />

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[
              styles.form,
              { paddingHorizontal: contentPad, paddingBottom: scrollBottomPad, maxWidth: 560, alignSelf: 'center', width: '100%' },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {car ? (
              <View style={styles.carCard}>
                {carImage ? (
                  <Image
                    source={{ uri: carImage }}
                    style={{ width: carImgSize, height: carImgSize }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.carImagePlaceholder, { width: carImgSize, height: carImgSize }]}>
                    <Ionicons name="car-sport-outline" size={isCompact ? 26 : 32} color={COLORS.secondary} />
                  </View>
                )}
                <View style={styles.carBody}>
                  <Text style={[styles.carName, isCompact && styles.carNameCompact]} numberOfLines={2}>
                    {car.name || `${car.brand} ${car.model}`}
                  </Text>
                  <View style={styles.carMetaRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
                    <Text style={styles.carMeta}>{car.location}</Text>
                  </View>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillTxt}>{formatMoneyPerDay(car.price_per_day)}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {bookingBlocked ? (
              <View style={styles.unavailableCard}>
                <View style={styles.unavailableIcon}>
                  <Ionicons name="car-sport-outline" size={22} color="#B45309" />
                </View>
                <View style={styles.unavailableBody}>
                  <Text style={styles.unavailableTitle}>Véhicule indisponible</Text>
                  <Text style={styles.unavailableSub}>
                    {carUnavailable
                      ? 'Ce véhicule est actuellement loué. Choisissez un autre modèle ou revenez plus tard.'
                      : quoteMessage ?? 'Impossible de calculer un devis pour ces dates.'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.unavailableBtn} onPress={() => router.back()} activeOpacity={0.88}>
                  <Ionicons name="search-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.unavailableBtnTxt}>Voir d'autres véhicules</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Période de location</Text>
              </View>
              <BookingDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                minStart={minStart}
                days={days}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
              </View>
              <TextInput
                style={styles.textarea}
                value={notes}
                onChangeText={setNotes}
                placeholder="Précisions pour l'agence…"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <LinearGradient
              colors={['#EBF5FB', '#D6EAF8']}
              style={styles.summary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLbl}>Durée</Text>
                  {quoteLoading || quoteFetching ? (
                    <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                  ) : (
                    <Text style={styles.summaryVal}>
                      {quote
                        ? `${quote.days} jour${quote.days > 1 ? 's' : ''}`
                        : days > 0
                          ? `${days} jour${days > 1 ? 's' : ''}`
                          : '—'}
                    </Text>
                  )}
                </View>
                <View style={styles.summaryDivider} />
                <View style={[styles.summaryItem, styles.summaryItemRight]}>
                  <Text style={styles.summaryLbl}>Total estimé</Text>
                  <Text style={styles.summaryTotal}>
                    {quote ? formatMoney(quote.total_price) : quoteLoading || quoteFetching ? '…' : '—'}
                  </Text>
                </View>
              </View>

              {quote ? (
                <Text style={styles.summaryHint}>
                  {formatMoney(quote.price_per_day)}/jour × {quote.days} jour{quote.days > 1 ? 's' : ''} — montant confirmé par le serveur.
                </Text>
              ) : null}
            </LinearGradient>
          </ScrollView>

          <View style={[styles.footer, { paddingHorizontal: contentPad, paddingBottom: footerBottomPad }]}>
            <View style={styles.footerPrice}>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={[styles.footerAmount, isCompact && styles.footerAmountCompact]}>
                {quote ? formatMoney(quote.total_price) : '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                isCompact && styles.confirmBtnCompact,
                !canSubmit && styles.confirmBtnDisabled,
              ]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.88}
            >
              {bookMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={[styles.confirmBtnTxt, isCompact && styles.confirmBtnTxtCompact]}>Confirmer</Text>
                  <Ionicons name="checkmark-circle-outline" size={isCompact ? 16 : 18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={!!successBooking}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessBooking(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSuccessBooking(null)}>
          <View style={styles.successBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.successCenter} pointerEvents="box-none">
          <View style={[styles.successCard, { marginHorizontal: contentPad }]}>
            <LinearGradient
              colors={['#EBF5FB', COLORS.white]}
              style={styles.successIconWrap}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              </View>
            </LinearGradient>

            <Text style={styles.successTitle}>Demande envoyée</Text>
            <Text style={styles.successSub}>
              Votre réservation a été transmise à l'agence. Vous serez notifié dès qu'elle sera confirmée.
            </Text>

            {successBooking ? (
              <View style={styles.successAmountBox}>
                <Text style={styles.successAmountLbl}>Montant confirmé</Text>
                <Text style={styles.successAmount}>{formatMoney(successBooking.total_price)}</Text>
                {car ? (
                  <Text style={styles.successCar} numberOfLines={1}>
                    {car.name || `${car.brand} ${car.model}`}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.successPrimaryBtn}
              activeOpacity={0.88}
              onPress={() => {
                if (!successBooking) return;
                const id = successBooking.id;
                setSuccessBooking(null);
                router.replace(`/booking/${id}`);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
              <Text style={styles.successPrimaryTxt}>Voir le détail</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondaryBtn}
              activeOpacity={0.88}
              onPress={() => {
                setSuccessBooking(null);
                router.replace('/(tabs)/bookings');
              }}
            >
              <Ionicons name="list-outline" size={18} color={COLORS.primary} />
              <Text style={styles.successSecondaryTxt}>Mes réservations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!errorMessage}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setErrorMessage(null)}
      >
        <TouchableWithoutFeedback onPress={() => setErrorMessage(null)}>
          <View style={styles.successBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.successCenter} pointerEvents="box-none">
          <View style={[styles.successCard, { marginHorizontal: contentPad }]}>
            <View style={[styles.successIconCircle, styles.errorIconCircle]}>
              <Ionicons name="alert-circle" size={48} color="#DC3545" />
            </View>
            <Text style={styles.successTitle}>Réservation impossible</Text>
            <Text style={styles.successSub}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.successPrimaryBtn}
              activeOpacity={0.88}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={styles.successPrimaryTxt}>Compris</Text>
            </TouchableOpacity>
            {errorMessage?.toLowerCase().includes('disponible') ? (
              <TouchableOpacity
                style={styles.successSecondaryBtn}
                activeOpacity={0.88}
                onPress={() => {
                  setErrorMessage(null);
                  router.back();
                }}
              >
                <Ionicons name="search-outline" size={18} color={COLORS.primary} />
                <Text style={styles.successSecondaryTxt}>Autres véhicules</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  loader: { marginTop: 48 },
  form: { paddingTop: 4 },
  authCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  authTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  authSub: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  carCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  carImagePlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carBody: { flex: 1, padding: 14, justifyContent: 'center', minWidth: 0 },
  carName: { fontSize: 17, fontWeight: '800', color: COLORS.black, marginBottom: 6 },
  carNameCompact: { fontSize: 15 },
  carMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  carMeta: { fontSize: 13, color: COLORS.gray, flex: 1 },
  pricePill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  pricePillTxt: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  textarea: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.black,
    minHeight: 88,
    marginTop: 8,
  },
  summary: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1 },
  summaryItemRight: { alignItems: 'flex-end' },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(29,53,87,0.12)', marginHorizontal: 12 },
  summaryLbl: { fontSize: 11, color: COLORS.secondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryVal: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  summaryTotal: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  summaryHint: { fontSize: 11, color: COLORS.gray, marginTop: 12, lineHeight: 16 },
  unavailableCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  unavailableIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  unavailableBody: { gap: 4 },
  unavailableTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  unavailableSub: { fontSize: 13, color: '#B45309', lineHeight: 19 },
  unavailableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  unavailableBtnTxt: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  errorIconCircle: { borderColor: 'rgba(220, 53, 69, 0.25)', marginTop: 20, marginBottom: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  footerPrice: { flex: 1 },
  footerLabel: { fontSize: 11, color: COLORS.gray, fontWeight: '600' },
  footerAmount: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  footerAmountCompact: { fontSize: 17 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 140,
    flexShrink: 0,
    justifyContent: 'center',
  },
  confirmBtnCompact: { paddingHorizontal: 16, paddingVertical: 12, minWidth: 120, gap: 6 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnTxt: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  confirmBtnTxtCompact: { fontSize: 14 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29, 53, 87, 0.45)',
  },
  successCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  successIconWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    marginBottom: 4,
    marginHorizontal: -22,
    paddingHorizontal: 22,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(40, 167, 69, 0.25)',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  successAmountBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  successAmountLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  successCar: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 6,
    fontWeight: '600',
  },
  successPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  successPrimaryTxt: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  successSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  successSecondaryTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
});
