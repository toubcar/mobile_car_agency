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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/api';
import { carsService } from '@/services/cars.service';
import { bookingsService } from '@/services/bookings.service';
import { useAuthStore } from '@/store/authStore';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import PageHeader from '@/components/PageHeader';
import BookingDateRangePicker, { daysLabel, toIsoDate } from '@/components/BookingDateRangePicker';
import { formatMoney, formatMoneyPerDay } from '@/utils/money';
import { rentalDays } from '@/utils/rental';
import { firstFreeStay, nightsBetween, stayIsFree } from '@/utils/dates';
import { payBooking, type PaymentOutcome } from '@/utils/payments';
import { useCarAvailability } from '@/hooks/useCarAvailability';

import { t } from '@/i18n';

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

  const queryClient = useQueryClient();
  const [startDate, setStartDateState] = useState(defaultStartDate);
  const [endDate, setEndDateState] = useState(() => defaultEndDate(defaultStartDate()));
  const [notes, setNotes] = useState('');
  const [successBooking, setSuccessBooking] = useState<{ id: number; total_price: number; outcome: PaymentOutcome } | null>(null);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const datesTouched = useRef(false);
  const setStartDate = (d: Date) => { datesTouched.current = true; setStartDateState(d); };
  const setEndDate = (d: Date) => { datesTouched.current = true; setEndDateState(d); };
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

  // The days the car is booked or in the garage: greyed out in red, and the stay must not cross them
  const availability = useCarAvailability(Number.isFinite(cid) ? cid : undefined);
  const stayFree = stayIsFree(startDate, endDate, availability.unavailable);

  // Opened on dates already taken: the first free stay of the same length (until the customer picks dates)
  useEffect(() => {
    if (datesTouched.current || availability.isLoading || stayIsFree(startDate, endDate, availability.unavailable)) return;
    const free = firstFreeStay(startDate, Math.max(1, nightsBetween(startDate, endDate)), availability.unavailable);
    setStartDateState(free.start);
    setEndDateState(free.end);
  }, [availability.isLoading, availability.unavailable]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: quote,
    isLoading: quoteLoading,
    isFetching: quoteFetching,
    error: quoteError,
  } = useQuery({
    queryKey: ['booking-quote', cid, startIso, endIso],
    queryFn: () => bookingsService.getQuote({ car_id: cid, start_date: startIso, end_date: endIso }),
    enabled: canQuote && stayFree,
    retry: false,
  });

  // As on the website: the booking is created, then paid with PayPal at once (it holds the car 15 minutes)
  const bookMutation = useMutation({
    mutationFn: async () => {
      const booking = await bookingsService.createBooking(
        { car_id: cid, start_date: startIso, end_date: endIso },
        user ?? undefined,
      );
      let outcome: PaymentOutcome = 'failed';
      try {
        outcome = await payBooking(booking.id);
      } catch {
        outcome = 'failed';
      }
      return { booking, outcome };
    },
    onSuccess: ({ booking, outcome }) => {
      datesTouched.current = true; // the days just booked turn red: the chosen dates stay as they are
      setSuccessBooking({ id: booking.id, total_price: booking.total_price, outcome });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void availability.refetch();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMessage(err?.response?.data?.message ?? t('Impossible de créer la réservation.'));
    },
  });

  const retryPayment = async () => {
    if (!successBooking) return;
    setPaying(true);
    const outcome = await payBooking(successBooking.id).catch((): PaymentOutcome => 'failed');
    setPaying(false);
    setSuccessBooking({ ...successBooking, outcome });
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };
  const paid = successBooking?.outcome === 'paid';
  // The booking exists now: leaving the message shows it (never the form again, which would book twice)
  const openCreatedBooking = () => {
    if (!successBooking) return;
    const id = successBooking.id;
    setSuccessBooking(null);
    router.replace(`/booking/${id}`);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <LinearGradient colors={['#C8E6F5', COLORS.background]} style={StyleSheet.absoluteFill} />
        <PageHeader title={t('Réserver')} />
        <View style={styles.authCenter}>
          <View style={styles.authIcon}>
            <Ionicons name="lock-closed-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.authTitle}>{t('Connexion requise')}</Text>
          <Text style={styles.authSub}>{t('Connectez-vous pour finaliser votre réservation.')}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => openAuthSheet('login', carId ? `/booking/create?carId=${carId}` : undefined)}
          >
            <Text style={styles.primaryBtnTxt}>{t('Se connecter')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const quoteMessage =
    quoteError && typeof quoteError === 'object' && 'response' in quoteError
      ? (() => {
          const msg = (quoteError as { response?: { data?: { message?: string } } }).response?.data?.message;
          if (msg?.includes('No query results for model') && msg?.includes('quote')) {
            return t('Le serveur doit être mis à jour (route /api/bookings/quote). Contactez l’administrateur.');
          }
          return msg;
        })()
      : quoteError
        ? 'Devis indisponible pour ces dates.'
        : null;

  const carUnavailable = Boolean(car && !car.is_available) || !availability.bookable;
  const bookingBlocked = carUnavailable || (stayFree && !!quoteMessage && !quote && !quoteLoading);

  const submit = () => {
    if (bookingBlocked) return;
    if (days < 1) {
      setErrorMessage(t('La date de fin doit être après la date de début.'));
      return;
    }
    if (!stayFree) {
      setErrorMessage(t('Ces dates comprennent des jours où le véhicule est indisponible : choisissez un autre jour de retour.'));
      return;
    }
    if (!quote && !quoteLoading) {
      setErrorMessage(quoteMessage ?? t('Attendez le calcul du montant par le serveur.'));
      return;
    }
    bookMutation.mutate();
  };

  const carImage = car?.images?.[0];
  const canSubmit = !!quote && stayFree && !bookMutation.isPending && !bookingBlocked;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.headerGradient} />
      <PageHeader title={t('Réserver')} />

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
                  <Text style={styles.unavailableTitle}>{t('Véhicule indisponible')}</Text>
                  <Text style={styles.unavailableSub}>
                    {carUnavailable
                      ? t('Ce véhicule est actuellement loué. Choisissez un autre modèle ou revenez plus tard.')
                      : quoteMessage ?? t('Impossible de calculer un devis pour ces dates.')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.unavailableBtn} onPress={() => router.back()} activeOpacity={0.88}>
                  <Ionicons name="search-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.unavailableBtnTxt}>{t("Voir d'autres véhicules")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{t('Période de location')}</Text>
              </View>
              <BookingDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                minStart={minStart}
                days={days}
                unavailable={availability.unavailable}
                loadingAvailability={availability.isLoading}
              />
              {!stayFree ? (
                <View style={styles.crossWarning}>
                  <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                  <Text style={styles.crossWarningTxt}>
                    {t('Ces dates comprennent des jours où le véhicule est indisponible : choisissez un autre jour de retour.')}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{t('Notes (optionnel)')}</Text>
              </View>
              <TextInput
                style={styles.textarea}
                value={notes}
                onChangeText={setNotes}
                placeholder={t("Précisions pour l'agence…")}
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
                  <Text style={styles.summaryLbl}>{t('Durée')}</Text>
                  {quoteLoading || quoteFetching ? (
                    <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                  ) : (
                    <Text style={styles.summaryVal}>
                      {quote ? daysLabel(quote.days) : days > 0 ? daysLabel(days) : '—'}
                    </Text>
                  )}
                </View>
                <View style={styles.summaryDivider} />
                <View style={[styles.summaryItem, styles.summaryItemRight]}>
                  <Text style={styles.summaryLbl}>{t('Total estimé')}</Text>
                  <Text style={styles.summaryTotal}>
                    {quote ? formatMoney(quote.total_price) : quoteLoading || quoteFetching ? '…' : '—'}
                  </Text>
                </View>
              </View>

              {quote ? (
                <Text style={styles.summaryHint}>
                  {t(':price par jour × :days', { price: formatMoney(quote.price_per_day), days: daysLabel(quote.days) })}
                </Text>
              ) : null}
              <View style={styles.payNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.secondary} />
                <Text style={styles.payNoteTxt}>{t('Paiement sécurisé par PayPal — aucun compte PayPal n\'est nécessaire.')}</Text>
              </View>
            </LinearGradient>
          </ScrollView>

          <View style={[styles.footer, { paddingHorizontal: contentPad, paddingBottom: footerBottomPad }]}>
            <View style={styles.footerPrice}>
              <Text style={styles.footerLabel}>{t('Total')}</Text>
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
                  <Text style={[styles.confirmBtnTxt, isCompact && styles.confirmBtnTxtCompact]}>{t('Réserver et payer')}</Text>
                  <Ionicons name="lock-closed-outline" size={isCompact ? 15 : 16} color="#FFF" />
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
        onRequestClose={openCreatedBooking}
      >
        <TouchableWithoutFeedback onPress={openCreatedBooking}>
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
              <View style={[styles.successIconCircle, !paid && styles.pendingIconCircle]}>
                <Ionicons name={paid ? 'checkmark-circle' : 'time'} size={48} color={paid ? COLORS.success : '#D97706'} />
              </View>
            </LinearGradient>

            <Text style={styles.successTitle}>{paid ? t('Paiement réussi') : t('Paiement non effectué')}</Text>
            <Text style={styles.successSub}>
              {paid
                ? t('Votre réservation est confirmée.')
                : t('Votre réservation vous est gardée 15 minutes : payez-la pour la confirmer. Aucun montant n\'a été débité.')}
            </Text>

            {successBooking ? (
              <View style={styles.successAmountBox}>
                <Text style={styles.successAmountLbl}>{paid ? t('Montant payé') : t('Montant à payer')}</Text>
                <Text style={styles.successAmount}>{formatMoney(successBooking.total_price)}</Text>
                {car ? (
                  <Text style={styles.successCar} numberOfLines={1}>
                    {car.name || `${car.brand} ${car.model}`}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {!paid ? (
              <TouchableOpacity style={styles.successPrimaryBtn} activeOpacity={0.88} onPress={() => void retryPayment()} disabled={paying}>
                {paying ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="card-outline" size={18} color={COLORS.white} />
                    <Text style={styles.successPrimaryTxt}>{t('Payer maintenant')}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={paid ? styles.successPrimaryBtn : styles.successSecondaryBtn}
              activeOpacity={0.88}
              onPress={() => {
                if (!successBooking) return;
                const id = successBooking.id;
                setSuccessBooking(null);
                router.replace(`/booking/${id}`);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={paid ? COLORS.white : COLORS.primary} />
              <Text style={paid ? styles.successPrimaryTxt : styles.successSecondaryTxt}>{t('Voir le détail')}</Text>
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
              <Text style={styles.successSecondaryTxt}>{t('Mes réservations')}</Text>
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
            <Text style={styles.successTitle}>{t('Réservation impossible')}</Text>
            <Text style={styles.successSub}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.successPrimaryBtn}
              activeOpacity={0.88}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={styles.successPrimaryTxt}>{t('Compris')}</Text>
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
                <Text style={styles.successSecondaryTxt}>{t('Autres véhicules')}</Text>
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
  pendingIconCircle: { borderColor: 'rgba(217, 119, 6, 0.25)' },
  crossWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2' },
  crossWarningTxt: { flex: 1, fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  payNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  payNoteTxt: { flex: 1, fontSize: 11, color: COLORS.secondary, lineHeight: 15 },
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
    marginBottom: 10,
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
