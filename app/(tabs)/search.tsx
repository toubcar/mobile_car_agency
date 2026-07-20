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
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { carsService } from '../../services/cars.service';
import { Car } from '../../types';
import { formatMoneyPerDay } from '@/utils/money';
import { formatFrenchDate } from '@/components/BookingDateRangePicker';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

const CATEGORY_LABELS: Record<string, string> = {
  SUV: 'SUV',
  Sedan: 'Berline',
  Economy: 'Économique',
  Luxury: 'Luxe',
  Hatchback: 'Citadine',
  Convertible: 'Cabriolet',
};

function parseIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    location?: string;
    quartier?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  }>();

  const location = typeof params.location === 'string' ? params.location : undefined;
  const quartier = typeof params.quartier === 'string' ? params.quartier : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const startDate = typeof params.start_date === 'string' ? params.start_date : undefined;
  const endDate = typeof params.end_date === 'string' ? params.end_date : undefined;

  const [search, setSearch] = useState('');

  const hasFilters = Boolean(location || quartier || category || startDate || endDate);

  const { data, isLoading } = useQuery({
    queryKey: ['cars', 'search', location, quartier, category, startDate, endDate],
    queryFn: () =>
      carsService.getCars({
        ...(location ? { location } : {}),
        ...(quartier ? { quartier } : {}),
        ...(category ? { category } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      }),
  });

  const all = data?.data ?? [];
  const cars = all.filter((car) => {
    const name = [car.name, car.brand, car.model].filter(Boolean).join(' ').toLowerCase();
    const loc = (car.location ?? '').toLowerCase();
    const carQuartier = (car.quartier ?? '').toLowerCase();
    const matchSearch =
      search.length === 0 ||
      name.includes(search.toLowerCase()) ||
      loc.includes(search.toLowerCase()) ||
      carQuartier.includes(search.toLowerCase());
    const matchCity = !location || loc.includes(location.toLowerCase());
    const matchQuartier =
      !quartier ||
      carQuartier.includes(quartier.toLowerCase()) ||
      loc.includes(quartier.toLowerCase());
    const matchAvailable = startDate && endDate ? car.is_available !== false : true;
    return matchSearch && matchCity && matchQuartier && matchAvailable;
  });

  const openFilters = () => {
    router.push({
      pathname: '/(tabs)/search-filters',
      params: {
        ...(location ? { location } : {}),
        ...(quartier ? { quartier } : {}),
        ...(category ? { category } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
  };

  const resetFilters = () => {
    setSearch('');
    router.replace('/(tabs)/search');
  };

  const startLabel = startDate ? formatFrenchDate(parseIsoDate(startDate)!) : null;
  const endLabel = endDate ? formatFrenchDate(parseIsoDate(endDate)!) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Search header ── */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={18} color="#111827" />
          </TouchableOpacity>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Voiture, ville, marque..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {hasFilters && (
          <View style={styles.filtersSummary}>
            <TouchableOpacity style={styles.filtersSummaryBody} onPress={openFilters} activeOpacity={0.85}>
              {location ? (
                <View style={styles.filterTag}>
                  <Ionicons name="location-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText}>{location}</Text>
                </View>
              ) : null}
              {quartier ? (
                <View style={styles.filterTag}>
                  <Ionicons name="map-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText}>{quartier}</Text>
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
              {category ? (
                <View style={styles.filterTag}>
                  <Ionicons name="car-outline" size={12} color="#1D3557" />
                  <Text style={styles.filterTagText}>{CATEGORY_LABELS[category] ?? category}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={openFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
              <Text style={styles.editFilters}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={resetFilters}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              accessibilityLabel="Réinitialiser les filtres"
            >
              <Ionicons name="close-circle" size={22} color="#1D3557" />
            </TouchableOpacity>
          </View>
        )}

        {!hasFilters && (
          <TouchableOpacity style={styles.addFiltersBtn} onPress={openFilters} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={16} color="#1D3557" />
            <Text style={styles.addFiltersText}>Ajouter des filtres</Text>
          </TouchableOpacity>
        )}

        {/* Results count */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {isLoading ? '—' : cars.length} {cars.length === 1 ? 'résultat' : 'résultats'}
          </Text>
          <Text style={styles.sortLabel}>Pertinence</Text>
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
          renderItem={({ item }) => (
            <CarGridCard car={item} onPress={() => router.push(`/car/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucun véhicule trouvé</Text>
              <Text style={styles.emptyText}>Modifiez vos filtres ou votre recherche.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openFilters} activeOpacity={0.85}>
                <Text style={styles.emptyBtnText}>Modifier les filtres</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
          {car.name?.trim() || [car.brand, car.model].filter(Boolean).join(' ') || 'Vehicle'}
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
            <Text style={styles.categoryText}>{car.category}</Text>
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
  resetFilterBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
