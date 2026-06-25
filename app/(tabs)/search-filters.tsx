import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '@/components/PageHeader';
import BookingDateRangePicker, { toIsoDate } from '@/components/BookingDateRangePicker';
import { rentalDays } from '@/utils/rental';

const CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Meknès',
  'Oujda',
];

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'SUV', label: 'SUV' },
  { key: 'Sedan', label: 'Berline' },
  { key: 'Economy', label: 'Économique' },
  { key: 'Luxury', label: 'Luxe' },
  { key: 'Hatchback', label: 'Citadine' },
  { key: 'Convertible', label: 'Cabriolet' },
];

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

export default function SearchFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    location?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  }>();

  const initialStart = parseIsoDate(params.start_date) ?? defaultStartDate();
  const [city, setCity] = useState(params.location ?? '');
  const [category, setCategory] = useState(params.category ?? 'all');
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(
    () => parseIsoDate(params.end_date) ?? defaultEndDate(initialStart),
  );

  const minStart = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const days = rentalDays(toIsoDate(startDate), toIsoDate(endDate));

  const handleSearch = () => {
    router.push({
      pathname: '/(tabs)/search',
      params: {
        ...(city.trim() ? { location: city.trim() } : {}),
        ...(category !== 'all' ? { category } : {}),
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
      },
    });
  };

  const handleReset = () => {
    const start = defaultStartDate();
    setCity('');
    setCategory('all');
    setStartDate(start);
    setEndDate(defaultEndDate(start));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageHeader title="Rechercher" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Choisissez une ville, vos dates et le type de véhicule pour afficher les résultats.
        </Text>

        {/* Ville */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="location-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>Ville</Text>
          </View>
          <View style={styles.cityInputBox}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.cityInput}
              placeholder="Ex. Casablanca, Rabat..."
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
              autoCorrect={false}
            />
            {city.length > 0 && (
              <TouchableOpacity onPress={() => setCity('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityChips}>
            {CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, city === c && styles.cityChipActive]}
                onPress={() => setCity(city === c ? '' : c)}
                activeOpacity={0.75}
              >
                <Text style={[styles.cityChipText, city === c && styles.cityChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="calendar-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>Dates de location</Text>
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

        {/* Type */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="car-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>Type de véhicule</Text>
          </View>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryChipText, category === c.key && styles.categoryChipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.resetBtnText}>Réinitialiser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.searchBtnText}>Voir les résultats</Text>
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
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
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
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cityChipActive: { backgroundColor: '#EBF5FB', borderColor: '#1D3557' },
  cityChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  cityChipTextActive: { color: '#1D3557' },
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
