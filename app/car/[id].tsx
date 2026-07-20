import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  InteractionManager,
  PanResponder,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { carsService } from '../../services/cars.service';
import { useAuthStore } from '../../store/authStore';
import { formatMoneyPerDay } from '@/utils/money';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { patchCarsFavorite, patchFavoritesList } from '@/utils/favoritesCache';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');
const DISMISS_THRESHOLD = 120;

function fuelLabel(fuel?: string | null): string {
  const map: Record<string, string> = {
    petrol: 'Essence',
    diesel: 'Diesel',
    electric: 'Électrique',
    hybrid: 'Hybride',
  };
  return fuel ? (map[fuel.toLowerCase()] ?? fuel) : 'Essence';
}

function transmissionLabel(t?: string | null): string {
  if (!t) return '—';
  return t === 'automatic' ? 'Automatique' : 'Manuelle';
}

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const { openAuthSheet } = useAuthSheet();
  const { width: screenWidth } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryRef = useRef<FlatList<string>>(null);
  const lightboxRef = useRef<FlatList<string>>(null);

  const sheetHeight = SCREEN_HEIGHT;
  const galleryHeight = useMemo(
    () => Math.min(SCREEN_HEIGHT * 0.38, sheetHeight * 0.42),
    [sheetHeight],
  );

  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const dismissSheet = useCallback(
    (afterDismiss?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.back();
        afterDismiss?.();
      });
    },
    [backdropOpacity, router, sheetHeight, translateY],
  );

  const close = useCallback(() => dismissSheet(), [dismissSheet]);

  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY]);

  useEffect(() => {
    translateY.setValue(sheetHeight);
    open();
  }, [open, sheetHeight, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', id],
    queryFn: () => carsService.getCar(Number(id)),
    enabled: !!id,
  });

  const favMutation = useMutation({
    mutationFn: () => carsService.toggleFavorite(Number(id)),
    onSuccess: ({ is_favorite }) => {
      if (!car) return;
      patchCarsFavorite(queryClient, car.id, is_favorite);
      patchFavoritesList(queryClient, car, is_favorite);
      queryClient.setQueryData(['car', id], { ...car, is_favorite });
    },
  });

  const handleBook = () => {
    if (!car) return;
    const bookingRoute = `/booking/create?carId=${id}`;

    if (!isAuthenticated) {
      dismissSheet(() => {
        InteractionManager.runAfterInteractions(() => {
          openAuthSheet('login', bookingRoute);
        });
      });
      return;
    }

    dismissSheet(() => {
      InteractionManager.runAfterInteractions(() => {
        router.push(bookingRoute);
      });
    });
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      dismissSheet(() => {
        InteractionManager.runAfterInteractions(() => {
          openAuthSheet('login');
        });
      });
      return;
    }
    favMutation.mutate();
  };

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / screenWidth);
    if (index >= 0 && index !== photoIndex) setPhotoIndex(index);
  };

  const onLightboxScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (index >= 0 && index !== lightboxIndex) setLightboxIndex(index);
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setPhotoIndex(lightboxIndex);
    requestAnimationFrame(() => {
      galleryRef.current?.scrollToIndex({ index: lightboxIndex, animated: false });
    });
  }, [lightboxIndex]);

  const photos = car?.images ?? [];

  useEffect(() => {
    setPhotoIndex(0);
    setLightboxOpen(false);
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [car?.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    requestAnimationFrame(() => {
      lightboxRef.current?.scrollToIndex({ index: lightboxIndex, animated: false });
    });
  }, [lightboxOpen, lightboxIndex]);

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <StatusBar style="dark" translucent />
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY }],
              paddingBottom: insets.bottom,
            },
          ]}
        >
        {isLoading ? (
          <View style={styles.centered}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.fallbackClose, { top: insets.top + 8 }]}
              onPress={close}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <ActivityIndicator size="large" color="#1D3557" />
          </View>
        ) : !car ? (
          <View style={styles.centered}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.fallbackClose, { top: insets.top + 8 }]}
              onPress={close}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <Ionicons name="car-outline" size={48} color="#D1D5DB" />
            <Text style={styles.notFoundText}>Véhicule introuvable</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              bounces
              contentContainerStyle={styles.scrollContent}
            >
              {/* Galerie photos */}
              <View style={[styles.galleryBox, { height: galleryHeight }]}>
                <View style={[styles.topOverlay, { paddingTop: insets.top + 4 }]}>
                  <View style={styles.topRow}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={close}
                      hitSlop={12}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={22} color="#111827" />
                    </TouchableOpacity>
                    <View {...panResponder.panHandlers} style={styles.handleHit}>
                      <View style={styles.handle} />
                    </View>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={handleFavorite}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={car.is_favorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={car.is_favorite ? '#EF4444' : '#111827'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {photos.length > 0 ? (
                  <>
                    <FlatList
                      ref={galleryRef}
                      data={photos}
                      keyExtractor={(uri, i) => `${uri}-${i}`}
                      horizontal
                      pagingEnabled
                      bounces={photos.length > 1}
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToAlignment="start"
                      onMomentumScrollEnd={onGalleryScroll}
                      onScroll={onGalleryScroll}
                      scrollEventThrottle={16}
                      getItemLayout={(_, index) => ({
                        length: screenWidth,
                        offset: screenWidth * index,
                        index,
                      })}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          activeOpacity={0.92}
                          onPress={() => openLightbox(index)}
                          style={{ width: screenWidth, height: galleryHeight }}
                        >
                          <Image
                            source={{ uri: item }}
                            style={{
                              width: screenWidth,
                              height: galleryHeight,
                            }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity
                      style={styles.expandHint}
                      onPress={() => openLightbox(photoIndex)}
                      activeOpacity={0.85}
                      hitSlop={8}
                    >
                      <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    {photos.length > 1 ? (
                      <>
                        <View style={styles.photoCounter}>
                          <Text style={styles.photoCounterText}>
                            {photoIndex + 1} / {photos.length}
                          </Text>
                        </View>
                        <View style={styles.dotsRow}>
                          {photos.map((_, i) => (
                            <TouchableOpacity
                              key={i}
                              onPress={() => {
                                galleryRef.current?.scrollToIndex({ index: i, animated: true });
                                setPhotoIndex(i);
                              }}
                              hitSlop={8}
                            >
                              <View
                                style={[styles.dot, i === photoIndex && styles.dotActive]}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.galleryPlaceholder}>
                    <Text style={{ fontSize: 64 }}>🚗</Text>
                    <Text style={styles.noPhotoText}>Aucune photo disponible</Text>
                  </View>
                )}

                <View style={[styles.galleryBadges, { top: insets.top + 52 }]}>
                  <View style={[styles.availPill, {
                    backgroundColor: car.is_available ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)',
                  }]}>
                    <View style={styles.availDot} />
                    <Text style={styles.availText}>
                      {car.is_available ? 'Disponible' : 'Indisponible'}
                    </Text>
                  </View>

                  {car.rating > 0 ? (
                    <View style={styles.ratingPill}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.body}>
                <Text style={styles.carName}>{car.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.carLocation}>{car.location}</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{car.category}</Text>
                  </View>
                </View>

                <View style={styles.specsGrid}>
                  <SpecCard icon="people-outline" label="Places" value={`${car.seats ?? '—'}`} />
                  <SpecCard icon="settings-outline" label="Boîte" value={transmissionLabel(car.transmission)} />
                  <SpecCard icon="flash-outline" label="Carburant" value={fuelLabel(car.fuel_type)} />
                  <SpecCard icon="calendar-outline" label="Année" value={`${car.year ?? '—'}`} />
                </View>

                {car.description ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>À propos</Text>
                    <Text style={styles.description}>{car.description}</Text>
                  </View>
                ) : null}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Inclus dans la location</Text>
                  <View style={styles.includesGrid}>
                    {(car.has_delivery
                      ? [
                          { icon: 'car-outline', label: 'Livraison incluse' },
                          ...INCLUDES,
                        ]
                      : [
                          { icon: 'walk-outline', label: 'Retrait sur place' },
                          ...INCLUDES,
                        ]
                    ).map((item) => (
                      <View key={item.label} style={styles.includeItem}>
                        <View style={styles.includeIcon}>
                          <Ionicons name={item.icon as any} size={16} color="#1D3557" />
                        </View>
                        <Text style={styles.includeLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ height: 16 }} />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.footerLeft}>
                <Text style={styles.footerLabel}>Par jour</Text>
                <Text style={styles.footerPrice}>{formatMoneyPerDay(car.price_per_day)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.bookBtn, !car.is_available && styles.bookBtnDisabled]}
                onPress={handleBook}
                disabled={!car.is_available}
                activeOpacity={0.88}
              >
                <Text style={styles.bookBtnText}>
                  {car.is_available ? 'Réserver' : 'Indisponible'}
                </Text>
                {car.is_available ? (
                  <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        )}
        </Animated.View>

        {lightboxOpen && photos.length > 0 ? (
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeLightbox}
          >
            <View style={styles.lightboxRoot}>
              <StatusBar style="light" translucent />
              <FlatList
                ref={lightboxRef}
                data={photos}
                keyExtractor={(uri, i) => `lb-${uri}-${i}`}
                horizontal
                pagingEnabled
                bounces={photos.length > 1}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onLightboxScroll}
                onScroll={onLightboxScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={[styles.lightboxSlide, { width: screenWidth, height: SCREEN_HEIGHT }]}>
                    <Image
                      source={{ uri: item }}
                      style={styles.lightboxImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />

              <View style={[styles.lightboxHeader, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                  style={styles.lightboxCloseBtn}
                  onPress={closeLightbox}
                  hitSlop={12}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.lightboxCounter}>
                  {lightboxIndex + 1} / {photos.length}
                </Text>
                <View style={styles.lightboxCloseSpacer} />
              </View>

              {photos.length > 1 ? (
                <View style={[styles.lightboxDots, { paddingBottom: insets.bottom + 16 }]}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.lightboxDot, i === lightboxIndex && styles.lightboxDotActive]}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </Modal>
        ) : null}
      </View>
    </Modal>
  );
}

const INCLUDES = [
  { icon: 'headset-outline', label: 'Support 24/7' },
  { icon: 'refresh-outline', label: 'Annulation flexible' },
];

function SpecCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.specCard}>
      <View style={styles.specIconBox}>
        <Ionicons name={icon as any} size={18} color="#1D3557" />
      </View>
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  content: { flex: 1 },
  scroll: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  handleHit: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  expandHint: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  photoCounter: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    backgroundColor: 'rgba(17,24,39,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 12,
  },
  photoCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  fallbackClose: { position: 'absolute', right: 16, zIndex: 40 },
  notFoundText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  scrollContent: { paddingBottom: 8 },

  galleryBox: {
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
  },
  noPhotoText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  dotsRow: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  galleryBadges: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  availText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ratingText: { fontSize: 13, fontWeight: '800', color: '#111827' },

  body: { paddingHorizontal: 20, paddingTop: 18 },
  carName: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  carLocation: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  categoryPill: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryText: { fontSize: 11, color: '#1D3557', fontWeight: '700' },

  specsGrid: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  specCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  specIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specValue: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 2 },
  specLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 23 },

  includesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    width: '47%',
  },
  includeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  includeLabel: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerLeft: {},
  footerLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  footerPrice: { fontSize: 22, fontWeight: '900', color: '#111827' },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D3557',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  bookBtnDisabled: { backgroundColor: '#D1D5DB' },
  bookBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  lightboxRoot: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  lightboxSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  lightboxCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseSpacer: { width: 44 },
  lightboxCounter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lightboxDots: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  lightboxDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  lightboxDotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
});
