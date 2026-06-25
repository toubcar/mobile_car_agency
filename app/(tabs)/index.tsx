import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { carsService } from '../../services/cars.service';
import { formatMoneyPerDay } from '@/utils/money';
import { Car } from '../../types';
import { API_BASE_URL } from '../../constants/api';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { patchCarsFavorite, patchFavoritesList } from '@/utils/favoritesCache';

function describeApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : 'Erreur inconnue';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Délai dépassé — Laravel est-il démarré ?';
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return 'Réseau inaccessible — même Wi‑Fi que le PC ? Pare-feu ? php artisan serve --host=0.0.0.0';
  }
  const st = err.response?.status;
  if (st === 404) {
    return '404 — vérifiez que API_BASE_URL se termine par /api';
  }
  if (st != null && st >= 500) {
    return `Erreur serveur (${st}) — consultez les logs Laravel.`;
  }
  const msg = (err.response?.data as { message?: string } | undefined)?.message;
  return msg || err.message;
}

const { width: W } = Dimensions.get('window');
const FEATURED_W = W * 0.66;
const GRID_W     = (W - 48) / 2;

const CATEGORIES = [
  { key: 'all',         label: 'All' },
  { key: 'SUV',         label: 'SUV' },
  { key: 'Sedan',       label: 'Sedan' },
  { key: 'Economy',     label: 'Economy' },
  { key: 'Luxury',      label: 'Luxury' },
  { key: 'Hatchback',   label: 'Hatchback' },
  { key: 'Convertible', label: 'Convertible' },
];

export default function HomeScreen() {
  const router = useRouter();
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openAuthSheet } = useAuthSheet();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      const t = setTimeout(() => openAuthSheet('signup'), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, openAuthSheet]);

  /* Featured cars */
  const featuredQuery = useQuery({
    queryKey: ['cars', 'featured'],
    queryFn: () => carsService.getFeaturedCars(),
  });
  const {
    data: featuredData,
    isLoading: loadingFeatured,
    isError: featuredError,
    refetch: refetchFeatured,
  } = featuredQuery;

  /* All cars (filtered by category) */
  const browseQuery = useQuery({
    queryKey: ['cars', 'browse', activeCategory],
    queryFn: () =>
      activeCategory === 'all'
        ? carsService.getCars({ page: 1 })
        : carsService.getCars({ category: activeCategory, page: 1 }),
  });
  const {
    data: allData,
    isLoading: loadingAll,
    isError: browseError,
    refetch: refetchBrowse,
  } = browseQuery;

  const featured = featuredData ?? [];
  const allCars: Car[]  = allData?.data ?? [];
  const loadError     = featuredError || browseError;
  const loadErrorHint = describeApiError(featuredQuery.error ?? browseQuery.error);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {/* ── Sticky top bar ── */}
      <View style={styles.topBar}>
        {/* Greeting */}
        <View style={styles.greetBlock}>
          <Text style={styles.greetSmall}>{greeting()}</Text>
          <Text style={styles.greetName}>
            {user?.name ? user.name.split(' ')[0] : 'Bienvenue'} 👋
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => isAuthenticated ? router.push('/(tabs)/profile') : openAuthSheet('signup')}
          activeOpacity={0.8}
        >
          {initials ? (
            <View style={[styles.avatarInner, { backgroundColor: '#1D3557' }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          ) : (
            <View style={[styles.avatarInner, { backgroundColor: '#EBF5FB' }]}>
              <Ionicons name="person-outline" size={18} color="#457B9D" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/search-filters')}
        activeOpacity={0.85}
      >
        <View style={styles.searchLeft}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.searchTitle}>Où souhaitez-vous louer ?</Text>
            <Text style={styles.searchSub}>Ville · Type · Disponibilité</Text>
          </View>
        </View>
        <View style={styles.filterBtn}>
          <Ionicons name="options-outline" size={15} color="#1D3557" />
        </View>
      </TouchableOpacity>

      {loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={22} color="#B45309" />
          <View style={styles.errorBannerText}>
            <Text style={styles.errorBannerTitle}>Impossible de charger les véhicules</Text>
            <Text style={styles.errorBannerSub}>
              {loadErrorHint}
              {'\n'}
              API : {API_BASE_URL}
              {'\n'}
              Vérifiez : Laravel actif (php artisan serve --host=0.0.0.0 --port=8000), même Wi‑Fi que le téléphone.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { refetchFeatured(); refetchBrowse(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Featured ── */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <View>
              <Text style={styles.blockTitle}>Véhicules à la une</Text>
              <Text style={styles.blockSub}>Sélection pour vous</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {loadingFeatured ? (
            <ActivityIndicator color="#1D3557" style={styles.loader} />
          ) : featured.length === 0 ? null : (
            <FlatList
              data={featured}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              renderItem={({ item }) => (
                <FeaturedCard
                  car={item}
                  onPress={() => router.push(`/car/${item.id}`)}
                  isAuthenticated={isAuthenticated}
                  onAuthRequired={() => openAuthSheet('signup')}
                />
              )}
            />
          )}
        </View>

        {/* ── Browse ── */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <View>
              <Text style={styles.blockTitle}>Parcourir</Text>
              <Text style={styles.blockSub}>{allCars.length} disponible{allCars.length > 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.chip, activeCategory === cat.key && styles.chipActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, activeCategory === cat.key && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 2-column grid */}
          {loadingAll ? (
            <ActivityIndicator color="#1D3557" style={styles.loader} />
          ) : (
            <View style={styles.grid}>
              {allCars.map((car) => (
                <GridCard
                  key={car.id}
                  car={car}
                  onPress={() => router.push(`/car/${car.id}`)}
                  isAuthenticated={isAuthenticated}
                  onAuthRequired={() => openAuthSheet('signup')}
                />
              ))}
              {allCars.length === 0 && (
                <View style={styles.emptyBlock}>
                  <Ionicons name="car-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Aucun véhicule dans cette catégorie</Text>
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────────────────────────────────────────
   Featured card (horizontal, tall)
─────────────────────────────────────────── */
function carDisplayName(car: Car): string {
  const n = car.name?.trim();
  if (n) return n;
  const b = [car.brand, car.model].filter(Boolean).join(' ').trim();
  return b || 'Vehicle';
}

function FeaturedCard({ car, onPress, isAuthenticated, onAuthRequired }: {
  car: Car; onPress: () => void; isAuthenticated: boolean; onAuthRequired: () => void;
}) {
  const queryClient = useQueryClient();
  const [favorited, setFavorited] = useState(Boolean(car.is_favorite));

  useEffect(() => {
    setFavorited(Boolean(car.is_favorite));
  }, [car.id, car.is_favorite]);

  const fav = useMutation({
    mutationFn: () => carsService.toggleFavorite(car.id),
    onMutate: () => setFavorited((v) => !v),
    onSuccess: ({ is_favorite }) => {
      setFavorited(is_favorite);
      patchCarsFavorite(queryClient, car.id, is_favorite);
      patchFavoritesList(queryClient, car, is_favorite);
    },
    onError: () => setFavorited(Boolean(car.is_favorite)),
  });

  const handleFavorite = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    fav.mutate();
  };

  return (
    <View style={styles.featuredCard}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
        <View style={styles.featuredImgBox}>
          {car.images?.[0] ? (
            <Image source={{ uri: car.images[0] }} style={styles.featuredImg} resizeMode="cover" />
          ) : (
            <View style={styles.imgFallback}><Text style={{ fontSize: 40 }}>🚗</Text></View>
          )}

          <View style={[styles.availBadge, { backgroundColor: car.is_available ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.availDot, { backgroundColor: car.is_available ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.availText, { color: car.is_available ? '#065F46' : '#991B1B' }]}>
              {car.is_available ? 'Disponible' : 'Loué'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
        {car.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.cardName} numberOfLines={1}>{carDisplayName(car)}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
          <Text style={styles.cardLocation} numberOfLines={1}>{car.location ?? '—'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.priceNum}>{formatMoneyPerDay(car.price_per_day)}</Text>
          {car.category ? (
            <View style={styles.catPill}>
              <Text style={styles.catText}>{car.category}</Text>
            </View>
          ) : null}
        </View>
      </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.heartBtn}
        onPress={handleFavorite}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={fav.isPending}
      >
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={16}
          color={favorited ? '#EF4444' : '#6B7280'}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ──────────────────────────────────────────
   Grid card (2-column)
─────────────────────────────────────────── */
function GridCard({ car, onPress, isAuthenticated, onAuthRequired }: {
  car: Car; onPress: () => void; isAuthenticated: boolean; onAuthRequired: () => void;
}) {
  const queryClient = useQueryClient();
  const [favorited, setFavorited] = useState(Boolean(car.is_favorite));

  useEffect(() => {
    setFavorited(Boolean(car.is_favorite));
  }, [car.id, car.is_favorite]);

  const fav = useMutation({
    mutationFn: () => carsService.toggleFavorite(car.id),
    onMutate: () => setFavorited((v) => !v),
    onSuccess: ({ is_favorite }) => {
      setFavorited(is_favorite);
      patchCarsFavorite(queryClient, car.id, is_favorite);
      patchFavoritesList(queryClient, car, is_favorite);
    },
    onError: () => setFavorited(Boolean(car.is_favorite)),
  });

  const handleFavorite = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    fav.mutate();
  };

  return (
    <View style={styles.gridCard}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
        <View style={styles.gridImgBox}>
          {car.images?.[0] ? (
            <Image source={{ uri: car.images[0] }} style={styles.gridImg} resizeMode="cover" />
          ) : (
            <View style={styles.imgFallback}><Text style={{ fontSize: 30 }}>🚗</Text></View>
          )}

          <View style={[styles.availDotAbs, { backgroundColor: car.is_available ? '#10B981' : '#EF4444' }]} />
        </View>

        <View style={styles.gridBody}>
        {car.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.cardName} numberOfLines={1}>{carDisplayName(car)}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={10} color="#9CA3AF" />
          <Text style={styles.cardLocation} numberOfLines={1}>{car.location ?? '—'}</Text>
        </View>
        <Text style={styles.gridPrice}>
          {formatMoneyPerDay(car.price_per_day)}
        </Text>
      </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.heartBtnSm}
        onPress={handleFavorite}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={fav.isPending}
      >
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={14}
          color={favorited ? '#EF4444' : '#6B7280'}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  greetBlock: {},
  greetSmall: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  greetName:  { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  searchTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  searchSub:   { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  filterBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorBannerText: { flex: 1 },
  errorBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  errorBannerSub:   { fontSize: 11, color: '#B45309', lineHeight: 15 },
  retryBtn: {
    backgroundColor: '#1D3557',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  /* Scroll */
  scroll: { paddingBottom: 110 },

  /* Block */
  block: { marginTop: 20 },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  blockTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  blockSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  seeAll:     { fontSize: 13, fontWeight: '700', color: '#457B9D' },
  loader:     { marginVertical: 30 },

  /* Featured list */
  featuredList: { paddingHorizontal: 16, gap: 14 },

  /* Featured card */
  featuredCard: {
    position: 'relative',
    width: FEATURED_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredImgBox: { position: 'relative', height: 180 },
  featuredImg:    { width: '100%', height: '100%' },
  imgFallback: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  availBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  availDot:  { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 10, fontWeight: '700' },

  /* Card shared body */
  cardBody: { padding: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  cardLocation: { fontSize: 11, color: '#9CA3AF', flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceNum:   { fontSize: 16, fontWeight: '800', color: '#111827' },
  priceSuffix:{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  catPill: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catText: { fontSize: 10, color: '#1D3557', fontWeight: '700' },

  /* Category chips */
  chipsScroll: { marginBottom: 14 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#1D3557', borderColor: '#1D3557' },
  chipText:   { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF' },

  /* Cars grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gridCard: {
    position: 'relative',
    width: GRID_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridImgBox: { position: 'relative', height: 130 },
  gridImg:    { width: '100%', height: '100%' },
  availDotAbs: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heartBtnSm: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBody: { padding: 10 },
  gridPrice: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 },

  /* Empty */
  emptyBlock: { flex: 1, alignItems: 'center', paddingVertical: 40, gap: 10, width: '100%' },
  emptyText:  { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
