import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { carsService } from '@/services/cars.service';
import { formatMoneyPerDay } from '@/utils/money';
import type { Car } from '@/types';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };
const FILTERS = [{ key: '', label: 'Tous' }, { key: 'true', label: 'Disponibles' }, { key: 'false', label: 'Indisponibles' }];

export default function AdminCarsScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-cars', search],
    queryFn:  () => carsService.getAll(1, search),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => carsService.toggleAvailability(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-cars'] }),
    onError:    () => Alert.alert('Erreur', 'Impossible de modifier la disponibilité.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => carsService.delete(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-cars'] }),
    onError:    () => Alert.alert('Erreur', 'Impossible de supprimer ce véhicule.'),
  });

  const confirmDelete = useCallback((car: Car) => {
    Alert.alert(
      'Supprimer', `Supprimer "${car.brand} ${car.model}" ?`,
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(car.id) }]
    );
  }, []);

  const cars = data?.data ?? [];
  const filtered = filter ? cars.filter((c) => String(c.is_available) === filter) : cars;
  const availableCount = cars.filter((c) => c.is_available).length;
  const unavailableCount = cars.length - availableCount;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/car-form/new' as any)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="car-sport-outline" size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>Catalogue admin</Text>
          <Text style={styles.heroTitle}>Gestion véhicules</Text>
          <Text style={styles.heroSub}>{data?.total ?? 0} véhicules synchronisés avec Laravel</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{cars.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#065F46' }]}>{availableCount}</Text><Text style={styles.statLabel}>Disponibles</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#991B1B' }]}>{unavailableCount}</Text><Text style={styles.statLabel}>Indispo.</Text></View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher…"
            placeholderTextColor="#C7C7CC"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#9CA3AF" /></TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipTxt, filter === f.key && styles.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/car-form/${item.id}` as any)} activeOpacity={0.8}>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carName}>{item.brand} {item.model}</Text>
                    <Text style={styles.carMeta}>{item.year} · {item.category} · {item.registration_number ?? 'Sans immat.'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.is_available ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: item.is_available ? '#065F46' : '#991B1B' }]}>{item.is_available ? 'Disponible' : 'Indispo.'}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => toggleMutation.mutate(item.id)} activeOpacity={0.7}>
                      <Ionicons name={item.is_available ? 'eye-outline' : 'eye-off-outline'} size={17} color={item.is_available ? '#10B981' : '#8E8E93'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRed]} onPress={() => confirmDelete(item)} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={17} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <View style={styles.specs}>
                    <View style={styles.spec}><Ionicons name="people-outline" size={12} color="#8E8E93" /><Text style={styles.specTxt}>{item.seats}pl</Text></View>
                    <View style={styles.spec}><Ionicons name="settings-outline" size={12} color="#8E8E93" /><Text style={styles.specTxt}>{item.transmission === 'automatic' ? 'Auto' : 'Man.'}</Text></View>
                    {item.rating ? <View style={styles.spec}><Ionicons name="star" size={12} color="#F59E0B" /><Text style={styles.specTxt}>{item.rating.toFixed(1)}</Text></View> : null}
                  </View>
                  <Text style={styles.price}>{formatMoneyPerDay(item.price_per_day)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucun véhicule</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#F2F2F7' },
  header: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 5 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', marginTop: 3 },
  heroSub: { fontSize: 12, color: '#D6EAF8', marginTop: 4, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, ...SHADOW },
  statVal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginTop: 3 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  chips: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip:        { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:     { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTxtActive: { color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 16, paddingBottom: 100 },
  card:   { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F7', ...SHADOW },
  cardBody: { flex: 1, padding: 14 },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  carName:  { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  carMeta:  { fontSize: 12, color: '#8E8E93' },
  cardActions: { flexDirection: 'row', gap: 6 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  iconBtn:    { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  iconBtnRed: { backgroundColor: '#FEF2F2' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  specs:      { flexDirection: 'row', gap: 10 },
  spec:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  specTxt:    { fontSize: 12, color: '#8E8E93' },
  price:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  priceUnit:  { fontSize: 11, fontWeight: '400', color: '#8E8E93' },
  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
