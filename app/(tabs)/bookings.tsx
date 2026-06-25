import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { bookingsService } from '../../services/bookings.service';
import { COLORS } from '../../constants/api';
import { Booking, Car } from '../../types';
import { formatMoney } from '@/utils/money';
import { useAuthStore } from '../../store/authStore';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { formatFrenchDate, toIsoDate } from '@/components/BookingDateRangePicker';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',  color: COLORS.warning,  bg: COLORS.warning + '20' },
  confirmed: { label: 'Confirmée',   color: COLORS.success,  bg: COLORS.success + '20' },
  cancelled: { label: 'Annulée',     color: COLORS.error,    bg: COLORS.error + '20' },
  completed: { label: 'Terminée',    color: COLORS.accent,   bg: COLORS.accent + '20' },
};

const MAX_CONTENT_WIDTH = 720;
const TAB_BAR_HEIGHT = 58;

function getCarSearchLabel(car?: Car): string {
  if (!car) return '';
  return [car.name, car.brand, car.model].filter(Boolean).join(' ').toLowerCase();
}

function bookingIncludesDate(booking: Booking, date: Date): boolean {
  const iso = toIsoDate(date);
  const start = booking.start_date.slice(0, 10);
  const end = booking.end_date.slice(0, 10);
  return iso >= start && iso <= end;
}

function useBookingsLayout() {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = screenW < 360;
  const isWide = screenW >= 600;
  const contentPad = Math.max(14, Math.round(screenW * 0.04));
  const contentWidth = Math.min(screenW, MAX_CONTENT_WIDTH);
  const listBottomPad = TAB_BAR_HEIGHT + insets.bottom + 16;
  const numColumns = isWide ? 2 : 1;
  const cardGap = 12;
  const cardWidth =
    numColumns === 2
      ? (contentWidth - contentPad * 2 - cardGap) / 2
      : contentWidth - contentPad * 2;

  return {
    screenW,
    insets,
    isCompact,
    isWide,
    contentPad,
    contentWidth,
    listBottomPad,
    numColumns,
    cardGap,
    cardWidth,
    useDateModal: screenW < 480 || Platform.OS === 'android',
  };
}

type BookingsFiltersProps = {
  vehicleQuery: string;
  onVehicleQueryChange: (value: string) => void;
  filterDate: Date | null;
  showDatePicker: boolean;
  onToggleDatePicker: () => void;
  onClearDate: () => void;
  onDateChange: (event: DateTimePickerEvent, selected?: Date) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  bookingsCount: number;
  filteredCount: number;
  layout: ReturnType<typeof useBookingsLayout>;
};

function BookingsFilters({
  vehicleQuery,
  onVehicleQueryChange,
  filterDate,
  showDatePicker,
  onToggleDatePicker,
  onClearDate,
  onDateChange,
  hasActiveFilters,
  onClearFilters,
  bookingsCount,
  filteredCount,
  layout,
}: BookingsFiltersProps) {
  const { isCompact, useDateModal } = layout;

  return (
    <View style={styles.filtersCard}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={17} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isCompact && styles.searchInputCompact]}
          placeholder={isCompact ? 'Véhicule...' : 'Nom du véhicule, marque...'}
          placeholderTextColor={COLORS.gray}
          value={vehicleQuery}
          onChangeText={onVehicleQueryChange}
          autoCorrect={false}
          returnKeyType="search"
        />
        {vehicleQuery.length > 0 ? (
          <TouchableOpacity onPress={() => onVehicleQueryChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.dateFilterRow}>
        <TouchableOpacity
          style={[styles.dateChip, filterDate && styles.dateChipActive]}
          onPress={onToggleDatePicker}
          activeOpacity={0.75}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={filterDate ? COLORS.primary : COLORS.gray}
          />
          <Text
            style={[styles.dateChipText, filterDate && styles.dateChipTextActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {filterDate ? formatFrenchDate(filterDate) : 'Filtrer par date'}
          </Text>
        </TouchableOpacity>

        {filterDate ? (
          <TouchableOpacity style={styles.clearDateBtn} onPress={onClearDate}>
            <Ionicons name="close" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!useDateModal && showDatePicker ? (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={filterDate ?? new Date()}
            mode="date"
            display="inline"
            onChange={onDateChange}
            locale="fr-FR"
          />
        </View>
      ) : null}

      {bookingsCount > 0 ? (
        <View style={styles.filtersFooter}>
          <Text style={styles.resultCount}>
            {filteredCount} réservation{filteredCount !== 1 ? 's' : ''}
          </Text>
          {hasActiveFilters ? (
            <TouchableOpacity onPress={onClearFilters}>
              <Text style={styles.clearFiltersText}>Réinitialiser</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {useDateModal ? (
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={onToggleDatePicker}>
          <Pressable style={styles.modalBackdrop} onPress={onToggleDatePicker}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choisir une date</Text>
                <TouchableOpacity onPress={onToggleDatePicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={filterDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                onChange={onDateChange}
                locale="fr-FR"
                style={styles.modalPicker}
              />
              <TouchableOpacity style={styles.modalDoneBtn} onPress={onToggleDatePicker}>
                <Text style={styles.modalDoneTxt}>Appliquer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { openAuthSheet } = useAuthSheet();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const layout = useBookingsLayout();
  const { contentPad, contentWidth, listBottomPad, numColumns, cardGap, isCompact } = layout;

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: () => bookingsService.getBookings(user),
    enabled: isAuthenticated,
  });

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const hasActiveFilters = vehicleQuery.trim().length > 0 || filterDate !== null;

  const filteredBookings = useMemo(() => {
    let list = bookings ?? [];
    const query = vehicleQuery.trim().toLowerCase();

    if (query) {
      list = list.filter((booking) => getCarSearchLabel(booking.car).includes(query));
    }

    if (filterDate) {
      list = list.filter((booking) => bookingIncludesDate(booking, filterDate));
    }

    return list;
  }, [bookings, vehicleQuery, filterDate]);

  const clearFilters = () => {
    setVehicleQuery('');
    setFilterDate(null);
    setShowDatePicker(false);
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setFilterDate(selected);
    }
  };

  const refreshBookings = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });

  const listHeader = (
    <View style={[styles.headerBlock, { paddingHorizontal: contentPad, width: contentWidth, alignSelf: 'center' }]}>
      <Text style={[styles.title, isCompact && styles.titleCompact]}>Mes Réservations</Text>
      <BookingsFilters
        vehicleQuery={vehicleQuery}
        onVehicleQueryChange={setVehicleQuery}
        filterDate={filterDate}
        showDatePicker={showDatePicker}
        onToggleDatePicker={() => setShowDatePicker((v) => !v)}
        onClearDate={() => setFilterDate(null)}
        onDateChange={onDateChange}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        bookingsCount={bookings?.length ?? 0}
        filteredCount={filteredBookings.length}
        layout={layout}
      />
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.notAuthContainer, { paddingHorizontal: layout.contentPad }]}>
          <Text style={styles.notAuthEmoji}>🔒</Text>
          <Text style={[styles.notAuthTitle, isCompact && styles.notAuthTitleCompact]}>Connexion requise</Text>
          <Text style={styles.notAuthText}>Connectez-vous pour voir vos réservations</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => openAuthSheet('login')}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {isLoading ? (
          <>
            {listHeader}
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          </>
        ) : (
          <FlatList
            data={filteredBookings}
            key={numColumns}
            keyExtractor={(item) => item.id.toString()}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? [styles.columnRow, { gap: cardGap, paddingHorizontal: contentPad }] : undefined}
            contentContainerStyle={[
              styles.list,
              {
                paddingBottom: listBottomPad,
                paddingHorizontal: numColumns === 1 ? contentPad : 0,
                width: contentWidth,
                alignSelf: 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                onRefresh={refreshBookings}
                cardWidth={layout.cardWidth}
                isCompact={isCompact}
              />
            )}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { paddingHorizontal: contentPad }]}>
                <Text style={styles.emptyEmoji}>{hasActiveFilters ? '🔍' : '📅'}</Text>
                <Text style={styles.emptyTitle}>
                  {hasActiveFilters ? 'Aucun résultat' : 'Aucune réservation'}
                </Text>
                <Text style={styles.emptyText}>
                  {hasActiveFilters
                    ? 'Aucune réservation ne correspond à vos filtres'
                    : "Vous n'avez pas encore de réservation"}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity style={styles.browseBtn} onPress={clearFilters}>
                    <Text style={styles.browseBtnText}>Réinitialiser les filtres</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={() => router.push('/(tabs)/search')}
                  >
                    <Text style={styles.browseBtnText}>Explorer les voitures</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  onRefresh,
  cardWidth,
  isCompact,
}: {
  booking: Booking;
  onRefresh: () => void;
  cardWidth: number;
  isCompact: boolean;
}) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancelBooking(booking.id),
    onSuccess: () => {
      Alert.alert('Annulée', 'Votre réservation a été annulée.');
      onRefresh();
    },
    onError: () => Alert.alert('Erreur', 'Impossible d’annuler cette réservation.'),
  });

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const carLabel = booking.car?.name || [booking.car?.brand, booking.car?.model].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.85}
      onPress={() => router.push(`/booking/${booking.id}`)}
    >
      <View style={[styles.cardHeader, isCompact && styles.cardHeaderCompact]}>
        <Text style={styles.carName} numberOfLines={2} ellipsizeMode="tail">
          {carLabel}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }, isCompact && styles.statusBadgeCompact]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={[styles.cardDates, isCompact && styles.cardDatesCompact]}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Arrivée</Text>
          <Text style={[styles.dateValue, isCompact && styles.dateValueCompact]} numberOfLines={1}>
            {new Date(booking.start_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <Text style={styles.dateSeparator}>→</Text>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Départ</Text>
          <Text style={[styles.dateValue, isCompact && styles.dateValueCompact]} numberOfLines={1}>
            {new Date(booking.end_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalPrice} numberOfLines={1}>
          Total : <Text style={styles.totalPriceNum}>{formatMoney(booking.total_price)}</Text>
        </Text>
        <View style={[styles.cardActions, isCompact && styles.cardActionsCompact]}>
          <TouchableOpacity
            style={[styles.msgBtn, isCompact && styles.actionBtnCompact]}
            onPress={(e) => { e.stopPropagation?.(); router.push(`/messages/${booking.id}`); }}
          >
            <Text style={[styles.msgBtnTxt, isCompact && styles.actionTxtCompact]}>Messages</Text>
          </TouchableOpacity>
          {canCancel ? (
            <TouchableOpacity
              style={[styles.cancelBtn, isCompact && styles.actionBtnCompact]}
              onPress={(e) => {
                e.stopPropagation?.();
                Alert.alert('Annuler', 'Confirmer l’annulation de cette réservation ?', [
                  { text: 'Non', style: 'cancel' },
                  { text: 'Oui', style: 'destructive', onPress: () => cancelMutation.mutate() },
                ]);
              }}
            >
              <Text style={[styles.cancelBtnTxt, isCompact && styles.actionTxtCompact]}>Annuler</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBlock: { width: '100%' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: 12 },
  titleCompact: { fontSize: 20 },
  filtersCard: {
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.black, paddingVertical: 10 },
  searchInputCompact: { fontSize: 14 },
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 0,
  },
  dateChipActive: {
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '10',
  },
  dateChipText: { flex: 1, fontSize: 14, color: COLORS.gray, fontWeight: '500', minWidth: 0 },
  dateChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  clearDateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  datePickerWrap: { overflow: 'hidden', borderRadius: 10, alignSelf: 'stretch' },
  filtersFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  resultCount: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  clearFiltersText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black },
  modalPicker: { alignSelf: 'center' },
  modalDoneBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  loader: { marginTop: 40 },
  list: { flexGrow: 1 },
  columnRow: { justifyContent: 'space-between', width: '100%', alignSelf: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderCompact: { flexWrap: 'wrap' },
  carName: { fontSize: 16, fontWeight: '700', color: COLORS.black, flex: 1, minWidth: 0 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  statusBadgeCompact: { alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardDates: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  cardDatesCompact: { paddingHorizontal: 8, paddingVertical: 10 },
  dateBlock: { flex: 1, alignItems: 'center', minWidth: 0 },
  dateLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: COLORS.black, textAlign: 'center' },
  dateValueCompact: { fontSize: 12 },
  dateSeparator: { fontSize: 18, color: COLORS.primary, paddingHorizontal: 4, flexShrink: 0 },
  cardFooter: { marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cardActionsCompact: { justifyContent: 'flex-start' },
  msgBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary },
  msgBtnTxt: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.error + '18' },
  cancelBtnTxt: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  actionBtnCompact: { paddingHorizontal: 10, paddingVertical: 8 },
  actionTxtCompact: { fontSize: 11 },
  totalPrice: { fontSize: 14, color: COLORS.gray },
  totalPriceNum: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  notAuthContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' },
  notAuthEmoji: { fontSize: 60, marginBottom: 16 },
  notAuthTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: 8, textAlign: 'center' },
  notAuthTitleCompact: { fontSize: 19 },
  notAuthText: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 24 },
  loginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  emptyContainer: { alignItems: 'center', paddingTop: 48, paddingBottom: 24, width: '100%' },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.black, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: COLORS.gray, marginBottom: 24, textAlign: 'center' },
  browseBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  browseBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
