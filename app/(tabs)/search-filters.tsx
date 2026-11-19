import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Keyboard,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '@/components/PageHeader';
import BookingDateRangePicker, { toIsoDate } from '@/components/BookingDateRangePicker';
import { rentalDays } from '@/utils/rental';
import { carsService } from '@/services/cars.service';
import { citiesService } from '@/services/cities.service';
import { CatalogueQuery, queryFromRoute, routeFromQuery } from '@/utils/catalogueParams';
import { CITIES, getQuartersForCity } from '@/constants/locations';
import { t, tl } from '@/i18n';

const SEAT_CHOICES = [2, 4, 5, 7];

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

function parseIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SearchFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initial = useMemo(() => queryFromRoute(params), [params]);

  const { data: options } = useQuery({
    queryKey: ['cars', 'filters'],
    queryFn: carsService.getFilters,
    staleTime: 5 * 60 * 1000,
  });

  const initialStart = parseIsoDate(initial.start_date);
  const [useDates, setUseDates] = useState(Boolean(initialStart) || !Object.keys(params).length);
  const [city, setCity] = useState(initial.location ?? '');
  const [quartier, setQuartier] = useState(initial.quartier ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [brand, setBrand] = useState(initial.brand ?? '');
  const [transmission, setTransmission] = useState<string[]>(initial.transmission ?? []);
  const [fuel, setFuel] = useState<string[]>(initial.fuel_type ?? []);
  const [seats, setSeats] = useState<number | undefined>(initial.seats);
  const [minPrice, setMinPrice] = useState(initial.min_price ? String(initial.min_price) : '');
  const [maxPrice, setMaxPrice] = useState(initial.max_price ? String(initial.max_price) : '');
  const [startDate, setStartDate] = useState(initialStart ?? defaultStartDate());
  const [endDate, setEndDate] = useState(() => parseIsoDate(initial.end_date) ?? defaultEndDate(initialStart ?? defaultStartDate()));

  const quarters = useMemo(() => getQuartersForCity(city), [city]);

  // the cities offered while typing, as in the website's search bar
  const [cityFocused, setCityFocused] = useState(false);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTyped(city.trim()), 150);
    return () => clearTimeout(timer);
  }, [city]);
  const listedCity = (CITIES as readonly string[]).includes(city);
  const { data: suggestions } = useQuery({
    queryKey: ['city-suggestions', typed],
    queryFn: () => citiesService.search(typed),
    enabled: cityFocused && typed.length > 0 && !listedCity,
    staleTime: 5 * 60 * 1000,
  });
  const showSuggestions = cityFocused && typed.length > 0 && !listedCity && (suggestions?.length ?? 0) > 0;

  const minStart = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const days = rentalDays(toIsoDate(startDate), toIsoDate(endDate));

  const selectCity = (c: string) => {
    setCity(city === c ? '' : c);
    setQuartier('');
  };

  const handleSearch = () => {
    const min = Number(minPrice);
    const max = Number(maxPrice);

    const next: CatalogueQuery = {
      q: initial.q,
      sort: initial.sort,
      location: city.trim() || undefined,
      quartier: city.trim() && quartier ? quartier : undefined,
      category: category || undefined,
      brand: brand || undefined,
      transmission,
      fuel_type: fuel,
      seats,
      min_price: Number.isFinite(min) && min > 0 ? min : undefined,
      max_price: Number.isFinite(max) && max > 0 ? max : undefined,
      ...(useDates ? { start_date: toIsoDate(startDate), end_date: toIsoDate(endDate) } : {}),
    };

    router.push({ pathname: '/(tabs)/search', params: routeFromQuery(next) });
  };

  const handleReset = () => {
    const start = defaultStartDate();
    setCity('');
    setQuartier('');
    setCategory('');
    setBrand('');
    setTransmission([]);
    setFuel([]);
    setSeats(undefined);
    setMinPrice('');
    setMaxPrice('');
    setUseDates(true);
    setStartDate(start);
    setEndDate(defaultEndDate(start));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageHeader title={t('Rechercher')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {t('Choisissez une ville, un quartier, vos dates et le type de véhicule pour afficher les résultats.')}
        </Text>

        {/* Ville */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="location-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Ville')}</Text>
          </View>
          <View style={styles.cityInputBox}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.cityInput}
              placeholder={t('Ex. Casablanca, Rabat...')}
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={(v) => { setCity(v); setQuartier(''); }}
              onFocus={() => setCityFocused(true)}
              onBlur={() => setTimeout(() => setCityFocused(false), 150)}
              autoCorrect={false}
            />
            {city.length > 0 && (
              <TouchableOpacity onPress={() => { setCity(''); setQuartier(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          {showSuggestions ? (
            <View style={styles.suggestions}>
              {suggestions!.slice(0, 6).map((item, i) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.suggestion, i > 0 && styles.suggestionBorder]}
                  onPress={() => { setCity(item.name); setQuartier(''); setCityFocused(false); Keyboard.dismiss(); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIcon}>
                    <Ionicons name="location-outline" size={18} color="#374151" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{item.label}</Text>
                    <Text style={[styles.suggestionSub, item.cars > 0 && styles.suggestionSubCars]}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={styles.cityGrid}>
            {CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, city === c && styles.cityChipActive]}
                onPress={() => selectCity(c)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={city === c ? 'location' : 'location-outline'}
                  size={14}
                  color={city === c ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.cityChipText, city === c && styles.cityChipTextActive]}>{tl(c)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quartier */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="map-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Quartier')}</Text>
          </View>
          {!city ? (
            <Text style={styles.hint}>{t('Sélectionnez d’abord une ville pour voir les quartiers.')}</Text>
          ) : (
            <View style={styles.cityGrid}>
              {quarters.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.cityChip, quartier === q && styles.cityChipActive]}
                  onPress={() => setQuartier(quartier === q ? '' : q)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.cityChipText, quartier === q && styles.cityChipTextActive]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="calendar-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Dates de location')}</Text>
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('Ne montrer que les véhicules libres à ces dates')}</Text>
            <Switch value={useDates} onValueChange={setUseDates} trackColor={{ true: '#1D3557' }} />
          </View>
          {useDates ? (
            <BookingDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
              minStart={minStart}
              days={days}
            />
          ) : null}
        </View>

        {/* Type */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="car-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Type de véhicule')}</Text>
          </View>
          <View style={styles.categoryGrid}>
            <Chip label={t('Tous')} active={category === ''} onPress={() => setCategory('')} />
            {(options?.categories ?? []).map((c) => (
              <Chip key={c.id} label={String(tl(c.name))} active={category === c.name} onPress={() => setCategory(category === c.name ? '' : c.name)} />
            ))}
          </View>
        </View>

        {/* Marque */}
        {options?.brands?.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="pricetag-outline" size={18} color="#1D3557" />
              <Text style={styles.sectionTitle}>{t('Marque')}</Text>
            </View>
            <View style={styles.categoryGrid}>
              <Chip label={t('Toutes')} active={brand === ''} onPress={() => setBrand('')} />
              {options.brands.map((b) => (
                <Chip key={b} label={b} active={brand === b} onPress={() => setBrand(brand === b ? '' : b)} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Boîte */}
        {options?.transmissions?.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="settings-outline" size={18} color="#1D3557" />
              <Text style={styles.sectionTitle}>{t('Boîte')}</Text>
            </View>
            <View style={styles.categoryGrid}>
              {options.transmissions.map((value) => (
                <Chip key={value} label={String(tl(value))} active={transmission.includes(value)} onPress={() => setTransmission(toggle(transmission, value))} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Carburant */}
        {options?.fuel_types?.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="flash-outline" size={18} color="#1D3557" />
              <Text style={styles.sectionTitle}>{t('Carburant')}</Text>
            </View>
            <View style={styles.categoryGrid}>
              {options.fuel_types.map((value) => (
                <Chip key={value} label={String(tl(value))} active={fuel.includes(value)} onPress={() => setFuel(toggle(fuel, value))} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Places */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="people-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Places')}</Text>
          </View>
          <View style={styles.categoryGrid}>
            <Chip label={t('Toutes')} active={seats === undefined} onPress={() => setSeats(undefined)} />
            {SEAT_CHOICES.filter((n) => !options?.max_seats || n <= options.max_seats).map((n) => (
              <Chip key={n} label={`${n}+`} active={seats === n} onPress={() => setSeats(seats === n ? undefined : n)} />
            ))}
          </View>
        </View>

        {/* Prix */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="cash-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>{t('Prix par jour')}</Text>
          </View>
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <TextInput
                style={styles.priceInput}
                keyboardType="numeric"
                placeholder={options ? String(options.min_price) : t('Min')}
                placeholderTextColor="#9CA3AF"
                value={minPrice}
                onChangeText={(v) => setMinPrice(v.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.priceUnit}>DH</Text>
            </View>
            <View style={styles.priceBox}>
              <TextInput
                style={styles.priceInput}
                keyboardType="numeric"
                placeholder={options ? String(options.max_price) : t('Max')}
                placeholderTextColor="#9CA3AF"
                value={maxPrice}
                onChangeText={(v) => setMaxPrice(v.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.priceUnit}>DH</Text>
            </View>
          </View>
          <Text style={styles.hint}>{t('Prix affichés : ceux que vous payez, commission de la plateforme comprise.')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.resetBtnText}>{t('Réinitialiser')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.searchBtnText}>{t('Voir les résultats')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 24 },
  lead: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
  },
  hint: { fontSize: 12, color: '#9CA3AF' },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6 },
  suggestionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6' },
  suggestionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  suggestionName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  suggestionSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  suggestionSubCars: { color: '#0A66C2' },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cityChipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
  cityChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  cityChipTextActive: { color: '#FFFFFF' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  categoryChipTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  priceInput: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600', padding: 0 },
  priceUnit: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  validateBtn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#1D3557',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  cityInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityInput: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  cityChips: { gap: 8, paddingVertical: 2 },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  searchBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1D3557',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
