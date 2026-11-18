import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { contentService, type HomeBanner } from '@/services/content.service';
import { useOpenSiteLink } from '@/hooks/useOpenSiteLink';
import { useLocale } from '@/i18n';

/** The banners the admin puts on the home page (Contenu > Bannières), in the app's language. */
export default function HomeBanners() {
  const locale = useLocale();
  const openLink = useOpenSiteLink();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const { data: banners = [] } = useQuery({
    queryKey: ['content-banners', locale],
    queryFn: () => contentService.banners(),
    staleTime: 10 * 60 * 1000,
  });

  if (!banners.length) return null;

  const cardWidth = width - 32;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12)));

  return (
    <View style={styles.root}>
      <FlatList
        data={banners}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => <Banner banner={item} width={cardWidth} onPress={() => openLink(item.link)} />}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => <View key={b.id} style={[styles.dot, i === index && styles.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

function Banner({ banner, width, onPress }: { banner: HomeBanner; width: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, { width }]} activeOpacity={banner.link ? 0.9 : 1} onPress={onPress} disabled={!banner.link}>
      {banner.image_url ? <Image source={{ uri: banner.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient
        colors={banner.image_url ? ['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.75)'] : [COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: banner.image_url ? 0 : 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
        {banner.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{banner.subtitle}</Text> : null}
        {banner.button_label && banner.link ? (
          <View style={styles.button}>
            <Text style={styles.buttonText}>{banner.button_label}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 8, marginBottom: 4 },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { height: 168, borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.primary, justifyContent: 'flex-end' },
  body: { padding: 18, gap: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  button: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 4 },
  buttonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotOn: { width: 18, backgroundColor: COLORS.primary },
});
