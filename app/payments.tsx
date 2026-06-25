import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { useAuthStore } from '@/store/authStore';
import { bookingsService } from '@/services/bookings.service';
import type { Booking } from '@/types';
import { formatMoney } from '@/utils/money';
import PageHeader from '@/components/PageHeader';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: 'Payé', color: COLORS.success, bg: COLORS.success + '18' },
  unpaid: { label: 'Non payé', color: COLORS.warning, bg: COLORS.warning + '22' },
  refunded: { label: 'Remboursé', color: COLORS.secondary, bg: COLORS.secondary + '18' },
};

function PaymentBookingCard({
  booking,
  cardWidth,
  isCompact,
  onPress,
}: {
  booking: Booking;
  cardWidth?: number;
  isCompact: boolean;
  onPress: () => void;
}) {
  const ps = PAY_STATUS[booking.payment_status ?? 'unpaid'] ?? PAY_STATUS.unpaid;
  const carLabel = booking.car?.name ?? [booking.car?.brand, booking.car?.model].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      style={[styles.bookingCard, cardWidth != null && { width: cardWidth }, isCompact && styles.bookingCardCompact]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.bookingTop, isCompact && styles.bookingTopCompact]}>
        <Text style={[styles.bookingTitle, isCompact && styles.bookingTitleCompact]} numberOfLines={2}>
          {carLabel}
        </Text>
        <View style={[styles.payBadge, { backgroundColor: ps.bg }]}>
          <Text style={[styles.payBadgeTxt, { color: ps.color }]}>{ps.label}</Text>
        </View>
      </View>
      <Text style={styles.bookingSub} numberOfLines={1}>
        {new Date(booking.start_date).toLocaleDateString('fr-FR')} · {formatMoney(booking.total_price)}
      </Text>
    </TouchableOpacity>
  );
}

export default function PaymentsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { isCompact, isWide, scrollContentStyle, headerGradientHeight, columnCardWidth, cardGap, contentPad } = layout;
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: () => bookingsService.getBookings(user),
    enabled: isAuthenticated && role === 'client',
  });

  const shell = (children: React.ReactNode) => (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#C8E6F5', COLORS.background]}
        style={[styles.headerGradient, { height: headerGradientHeight }]}
      />
      <PageHeader title="Paiements" />
      {children}
    </SafeAreaView>
  );

  if (!isAuthenticated) {
    return shell(
      <View style={[styles.center, { paddingHorizontal: contentPad }]}>
        <Text style={styles.centerTxt}>Connectez-vous pour voir vos paiements.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/onboarding')}>
          <Text style={styles.primaryBtnTxt}>Se connecter</Text>
        </TouchableOpacity>
      </View>,
    );
  }

  if (role === 'agence') {
    return shell(
      <ScrollView contentContainerStyle={[styles.scroll, scrollContentStyle]} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Paiements agence</Text>
          <Text style={styles.infoSub}>
            Demandez un virement depuis votre espace agence pour récupérer vos gains.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(agence)/finance')}>
          <Text style={styles.primaryBtnTxt}>Demander un virement</Text>
        </TouchableOpacity>
      </ScrollView>,
    );
  }

  if (role === 'admin') {
    return shell(
      <ScrollView contentContainerStyle={[styles.scroll, scrollContentStyle]} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/(admin)/finance')}>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>Demandes de paiement</Text>
            <Text style={styles.linkSub}>Approuver ou rejeter les virements agences</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>,
    );
  }

  const list = bookings ?? [];

  return shell(
    isLoading ? (
      <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
    ) : (
      <ScrollView contentContainerStyle={[styles.scroll, scrollContentStyle]} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Statut paiement — mes réservations</Text>
        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>Aucune réservation pour le moment.</Text>
          </View>
        ) : isWide ? (
          <View style={[styles.grid, { gap: cardGap }]}>
            {list.map((b) => (
              <PaymentBookingCard
                key={b.id}
                booking={b}
                cardWidth={columnCardWidth}
                isCompact={isCompact}
                onPress={() => router.push(`/booking/${b.id}`)}
              />
            ))}
          </View>
        ) : (
          list.map((b) => (
            <PaymentBookingCard
              key={b.id}
              booking={b}
              isCompact={isCompact}
              onPress={() => router.push(`/booking/${b.id}`)}
            />
          ))
        )}
      </ScrollView>
    ),
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: { paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerTxt: { fontSize: 15, color: COLORS.gray, marginBottom: 16, textAlign: 'center', fontWeight: '500' },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  empty: { color: COLORS.gray, fontSize: 14, fontWeight: '500' },
  bookingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignSelf: 'stretch',
  },
  bookingCardCompact: { padding: 14, marginBottom: 8 },
  bookingTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  bookingTopCompact: { flexDirection: 'column', gap: 8 },
  bookingTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.primary, minWidth: 0 },
  bookingTitleCompact: { fontSize: 14 },
  bookingSub: { fontSize: 13, color: COLORS.gray, marginTop: 8, fontWeight: '500' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0, alignSelf: 'flex-start' },
  payBadgeTxt: { fontSize: 11, fontWeight: '800' },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  infoTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  infoSub: { fontSize: 14, color: COLORS.gray, lineHeight: 21, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    gap: 12,
  },
  linkBody: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  linkSub: { fontSize: 12, color: COLORS.gray, marginTop: 3, fontWeight: '500' },
  chevron: { fontSize: 22, color: COLORS.gray, fontWeight: '300' },
});
