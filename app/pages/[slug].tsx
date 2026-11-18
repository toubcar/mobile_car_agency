import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import Markdown from '@/components/Markdown';
import { COLORS } from '@/constants/api';
import { contentService } from '@/services/content.service';
import { useOpenSiteLink } from '@/hooks/useOpenSiteLink';
import { describeApiError } from '@/utils/apiError';

import { t, jsLocale, useLocale } from '@/i18n';

/** A page written by the admin (terms, privacy, cancellation, legal notice), as on the website's /pages/{slug}. */
export default function SitePageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const locale = useLocale();
  const openLink = useOpenSiteLink();

  const { data: page, isLoading, error, refetch } = useQuery({
    queryKey: ['content-page', slug, locale],
    queryFn: () => contentService.page(String(slug)),
    enabled: !!slug,
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.gradient} />
      <PageHeader title={page?.title ?? t('Informations légales')} />
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 48 }} />
      ) : error || !page ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{describeApiError(error)}</Text>
          <TouchableOpacity onPress={() => void refetch()} style={styles.retry}>
            <Text style={styles.retryText}>{t('Réessayer')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            {page.updated_at ? (
              <Text style={styles.updated}>
                {t('Modifiée le :date', { date: new Date(page.updated_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) })}
              </Text>
            ) : null}
            <Markdown source={page.content} onLink={openLink} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  scroll: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.lightGray },
  updated: { fontSize: 12, color: COLORS.gray, marginBottom: 10 },
  errorBox: { alignItems: 'center', gap: 12, padding: 32 },
  errorText: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
