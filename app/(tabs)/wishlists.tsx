import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { carsService } from '../../services/cars.service';
import type { Car } from '../../types';
import { formatMoney } from '@/utils/money';
import PageHeader from '../../components/PageHeader';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { patchCarsFavorite, patchFavoritesList } from '@/utils/favoritesCache';

const { width } = Dimensions.get('window');

export default function WishlistsScreen() {
  const router = useRouter();
  const { openAuthSheet } = useAuthSheet();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [showTip, setShowTip] = useState(false);

  const scaleAnim  = useRef(new Animated.Value(0.85)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Afficher le tip seulement la première fois
    const checkTip = async () => {
      if (!isAuthenticated) {
        const seen = await AsyncStorage.getItem('wishlist_tip_seen');
        if (!seen) {
          setShowTip(true);
        }
      }
    };
    checkTip();
  }, [isAuthenticated]);

  useEffect(() => {
    if (showTip) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showTip]);

  const handleGotIt = async () => {
    await AsyncStorage.setItem('wishlist_tip_seen', 'true');
    Animated.timing(opacAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowTip(false));
  };

  // Si connecté → afficher les favoris
  if (isAuthenticated) {
    return <WishlistsConnected />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blurBg}>
        <PageHeader title="Favoris" showBack={false} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Connectez-vous pour voir vos favoris</Text>
          <Text style={styles.emptyText}>
            Vous pourrez créer, consulter ou modifier des listes de favoris après connexion.
          </Text>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => openAuthSheet('login')}
          >
            <Text style={styles.connectBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip modal */}
      <Modal transparent visible={showTip} animationType="none">
        <Animated.View style={[styles.overlay, { opacity: opacAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleGotIt} />
          <Animated.View style={[styles.tipCard, { transform: [{ scale: scaleAnim }], opacity: opacAnim }]}>

            {/* Bouton fermer */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleGotIt}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Icône cœur */}
            <View style={styles.heartIconContainer}>
              <View style={styles.heartIconBox}>
                <Text style={styles.heartIconEmoji}>💙</Text>
              </View>
            </View>

            {/* Texte */}
            <Text style={styles.tipTitle}>
              Enregistrez tous vos favoris au même endroit
            </Text>
            <Text style={styles.tipText}>
              Touchez l'icône cœur pour garder vos voitures préférées et les retrouver plus rapidement.
            </Text>

            {/* Bouton J'ai compris */}
            <TouchableOpacity style={styles.gotItBtn} onPress={handleGotIt}>
              <Text style={styles.gotItBtnText}>J'ai compris</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

function carLabel(car: Car): string {
  if (car.name?.trim()) return car.name.trim();
  return [car.brand, car.model].filter(Boolean).join(' ') || 'Véhicule';
}

/* ─── Page favoris quand connecté ─── */
function WishlistsConnected() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => carsService.getFavorites(),
  });
  const favorites = data ?? [];

  const unfav = useMutation({
    mutationFn: (carId: number) => carsService.toggleFavorite(carId),
    onSuccess: ({ is_favorite }, carId) => {
      const car = favorites.find((c) => c.id === carId);
      if (car) {
        patchCarsFavorite(queryClient, carId, is_favorite);
        patchFavoritesList(queryClient, car, is_favorite);
      } else {
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Favoris" showBack={false} />
      {isLoading ? (
        <ActivityIndicator color="#1D3557" style={{ marginTop: 40 }} />
      ) : favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🤍</Text>
          <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
          <Text style={styles.emptyText}>
            Appuyez sur le cœur sur une voiture pour l'ajouter à vos favoris.
          </Text>
          <TouchableOpacity style={styles.connectBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.connectBtnText}>Explorer les voitures</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.favList}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1D3557" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.favCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/car/${item.id}`)}
            >
              <View style={styles.favImgBox}>
                {item.images?.[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.favImg} resizeMode="cover" />
                ) : (
                  <View style={styles.favImgFallback}><Text style={{ fontSize: 28 }}>🚗</Text></View>
                )}
              </View>
              <View style={styles.favBody}>
                <Text style={styles.favName} numberOfLines={1}>{carLabel(item)}</Text>
                <Text style={styles.favLoc} numberOfLines={1}>{item.location ?? '—'}</Text>
                <Text style={styles.favPrice}>{formatMoney(item.price_per_day)}/jour</Text>
              </View>
              <TouchableOpacity
                style={styles.favHeart}
                onPress={() => unfav.mutate(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="heart" size={22} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  blurBg: { flex: 1 },

  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  connectBtn: {
    backgroundColor: '#1D3557',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Tip modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tipCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  heartIconContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  heartIconBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#EA580C',
    backgroundColor: '#FFF7F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  heartIconEmoji: { fontSize: 40 },

  tipTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  gotItBtn: {
    width: '100%',
    backgroundColor: '#1D3557',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1D3557',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  gotItBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  favList: { padding: 16, paddingBottom: 32, gap: 12 },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    padding: 10,
    gap: 12,
  },
  favImgBox: { width: 88, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  favImg: { width: '100%', height: '100%' },
  favImgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  favBody: { flex: 1 },
  favName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  favLoc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  favPrice: { fontSize: 13, fontWeight: '700', color: '#1D3557', marginTop: 6 },
  favHeart: { padding: 6 },
});
