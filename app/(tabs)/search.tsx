import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { carsService } from '../../services/cars.service';
import { Car, CatalogueSort } from '../../types';
import { formatMoneyPerDay } from '@/utils/money';
import { formatFrenchDate } from '@/components/BookingDateRangePicker';
import { activeFilterCount, apiParamsFromQuery, queryFromRoute, routeFromQuery } from '@/utils/catalogueParams';
import { t, tl, dirIcon } from '@/i18n';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

const SORT_OPTIONS: { key: CatalogueSort; label: () => string }[] = [
  { key: 'default', label: () => t('Pertinence') },
  { key: 'newest', label: () => t('Plus récentes') },
  { key: 'price_asc', label: () => t('Prix croissant') },
  { key: 'price_desc', label: () => t('Prix décroissant') },
  { key: 'rating_desc', label: () => t('Mieux notées') },
];

function parseIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const query = useMemo(() => queryFromRoute(params), [params]);

  // The search box asks the server (brand, model, city), a short moment after the last key
  const [text, setText] = useState(query.q ?? '');
  const [typed, setTyped] = useState(query.q ?? '');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTyped(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const filters = useMemo(() => ({ ...query, q: typed || undefined }), [query, typed]);
  const filterCount = activeFilterCount(filters);
  const sort = filters.sort ?? 'default';

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching, isError } = useInfiniteQuery({
    queryKey: ['cars', 'search', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => carsService.getCars({ ...apiParamsFromQuery(filters), page: pageParam }),
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  });

  const cars = useMemo(() => {
    const seen = new Set<number>();
    return (data?.pages ?? []).flatMap((page) => page.data).filter((car) => (seen.has(car.id) ? false : (seen.add(car.id), true)));
  }, [data]);
  const total = data?.pages[0]?.total ?? 0;

  const openFilters = () => {
    router.push({ pathname: '/(tabs)/search-filters', params: routeFromQuery({ ...query, q: typed || undefined }) });
  };

  const changeSort = (next: CatalogueSort) => {
    setSortOpen(false);
    router.setParams(routeFromQuery({ ...query, q: typed || undefined, sort: next }) as Record<string, string>);
  };

  const startLabel = filters.start_date ? formatFrenchDate(parseIsoDate(filters.start_date)!) : null;
  const endLabel = filters.end_date ? formatFrenchDate(parseIsoDate(filters.end_date)!) : null;
  const sortLabel = SORT_OPTIONS.find((option) => option.key === sort)?.label() ?? t('Pertinence');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Search header ── */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name={dirIcon('arrow-back')} size={18} color="#111827" />
          </TouchableOpacity>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={t('Voiture, ville, marque...')}
                placeholderTextColor="#9CA3AF"
                value={text}
                onChangeText={setText}
                autoCorrect={false}
              />
              {text.length > 0 && (
                <TouchableOpacity onPress={() => setText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {filterCount > 0 ? (
          <TouchableOpacity style={styles.filtersSummary} onPress={openFilters} activeOpacity={0.85}>
            <View style={styles.filtersSummaryBody}>
              {filters.location ? (
                <View style={styles.filterTag}>
                  <Ionicons name="location-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText}>{filters.location}</Text>
                </View>
              ) : null}
              {startLabel && endLabel ? (
                <View style={styles.filterTag}>
                  <Ionicons name="calendar-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText} numberOfLines={1}>
                    {startLabel} → {endLabel}
                  </Text>
                </View>
              ) : null}
              {filters.category || filters.brand || filters.seats || filters.transmission?.length || filters.fuel_type?.length ? (
                <View style={styles.filterTag}>
                  <Ionicons name="car-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText} numberOfLines={2}>
                    {[
                      filters.category ? tl(filters.category) : null,
                      filters.brand,
                      filters.seats ? t(':count places et plus', { count: filters.seats }) : null,
                      ...(filters.transmission ?? []).map((v) => tl(v)),
                      ...(filters.fuel_type ?? []).map((v) => tl(v)),
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {filters.min_price || filters.max_price ? (
                <View style={styles.filterTag}>
                  <Ionicons name="cash-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText}>
                    {`${filters.min_price ?? 0} – ${filters.max_price ?? '∞'} ${t('DH/jour')}`}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.editFilters}>{t('Modifier')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addFiltersBtn} onPress={openFilters} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={16} color="#1D3557" />
            <Text style={styles.addFiltersText}>{t('Ajouter des filtres')}</Text>
          </TouchableOpacity>
        )}

        {/* Results count and sort */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {isLoading ? '—' : total} {total === 1 ? t('résultat') : t('résultats')}
          </Text>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen(true)} activeOpacity={0.8}>
            <Ionicons name="swap-vertical" size={14} color="#1D3557" />
            <Text style={styles.sortLabel}>{sortLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Cars grid ── */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#1D3557" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={cars}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <CarGridCard car={item} onPress={() => router.push(`/car/${item.id}`)} />
          )}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#1D3557" style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{isError ? t('Chargement impossible') : t('Aucun véhicule trouvé')}</Text>
              <Text style={styles.emptyText}>{isError ? t('Appuyez pour réessayer') : t('Modifiez vos filtres ou votre recherche.')}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={isError ? () => void refetch() : openFilters} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>{isError ? t('Réessayer') : t('Modifier les filtres')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('Trier par')}</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity key={option.key} style={styles.sheetRow} onPress={() => changeSort(option.key)} activeOpacity={0.75}>
                <Text style={[styles.sheetRowText, option.key === sort && styles.sheetRowTextActive]}>{option.label()}</Text>
                {option.key === sort ? <Ionicons name="checkmark" size={18} color="#1D3557" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CarGridCard({ car, onPress }: { car: Car; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.cardImageBox}>
        {car.images?.[0] ? (
          <Image source={{ uri: car.images[0] }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImageFallback}>
            <Text style={{ fontSize: 34 }}>🚗</Text>
          </View>
        )}

        {/* Availability dot */}
        <View style={[styles.availDot, {
          backgroundColor: car.is_available ? '#10B981' : '#EF4444',
        }]} />

        {/* Heart */}
        <View style={styles.heartBox}>
          <Ionicons
            name={car.is_favorite ? 'heart' : 'heart-outline'}
            size={15}
            color={car.is_favorite ? '#EF4444' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        {/* Rating */}
        {car.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
          </View>
        )}

        <Text style={styles.cardName} numberOfLines={1}>
          {car.name?.trim() || [car.brand, car.model].filter(Boolean).join(' ') || t('Véhicule')}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={10} color="#9CA3AF" />
          <Text style={styles.cardLocation} numberOfLines={1}>{car.location ?? '—'}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatMoneyPerDay(car.price_per_day)}</Text>
        </View>

        {car.category ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{tl(car.category)}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },

  filtersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EBF5FB',
    borderWidth: 1,
    borderColor: '#D6EAF8',
    gap: 8,
  },
  filtersSummaryBody: { flex: 1, gap: 6 },
  filterTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterTagText: { fontSize: 12, fontWeight: '600', color: '#1D3557', flex: 1 },
  editFilters: { fontSize: 12, fontWeight: '800', color: '#1D3557' },
  addFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  addFiltersText: { fontSize: 13, fontWeight: '700', color: '#1D3557' },

  /* Results bar */
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  resultsCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  sortLabel:    { fontSize: 12, color: '#1D3557', fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  sheetRowText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  sheetRowTextActive: { color: '#1D3557', fontWeight: '800' },

  /* Grid */
  grid: { padding: 16, paddingBottom: 100 },
  row:  { gap: 12, marginBottom: 12 },

  /* Card */
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImageBox: { position: 'relative', height: 130 },
  cardImage: { width: '100%', height: '100%' },
  cardImageFallback: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availDot: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heartBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Card body */
  cardBody: { padding: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  cardLocation: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: '#111827' },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryText: { fontSize: 10, color: '#1D3557', fontWeight: '700' },

  /* Empty */
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1D3557',
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
