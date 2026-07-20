import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '@/components/PageHeader';
import BookingDateRangePicker, { toIsoDate } from '@/components/BookingDateRangePicker';
import { rentalDays } from '@/utils/rental';
import { CITIES, getQuartersForCity } from '@/constants/locations';

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
    quartier?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  }>();

  const initialStart = parseIsoDate(params.start_date) ?? defaultStartDate();
  const [city, setCity] = useState(params.location ?? '');
  const [quartier, setQuartier] = useState(params.quartier ?? '');
  const [category, setCategory] = useState(params.category ?? 'all');
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(
    () => parseIsoDate(params.end_date) ?? defaultEndDate(initialStart),
  );

  const quarters = useMemo(() => getQuartersForCity(city), [city]);

  const minStart = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const days = rentalDays(toIsoDate(startDate), toIsoDate(endDate));

  const selectCity = (c: string) => {
    if (city === c) {
      setCity('');
      setQuartier('');
      return;
    }
    setCity(c);
    setQuartier('');
  };

  const handleValidate = () => {
    if (!city) {
      Alert.alert('Ville requise', 'Veuillez sélectionner une ville dans la liste.');
      return;
    }
    router.push({
      pathname: '/(tabs)/search',
      params: {
        location: city,
        ...(quartier ? { quartier } : {}),
        ...(category !== 'all' ? { category } : {}),
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
      },
    });
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
          Choisissez une ville, un quartier, vos dates et le type de véhicule.
        </Text>

        {/* Ville */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="location-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>Ville</Text>
          </View>
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
                <Text style={[styles.cityChipText, city === c && styles.cityChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quartier */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="map-outline" size={18} color="#1D3557" />
            <Text style={styles.sectionTitle}>Quartier</Text>
          </View>
          {!city ? (
            <Text style={styles.hint}>Sélectionnez d’abord une ville pour voir les quartiers.</Text>
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
        <TouchableOpacity style={styles.validateBtn} onPress={handleValidate} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.validateBtnText}>Valider</Text>
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
  hint: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  footer: {
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
});
