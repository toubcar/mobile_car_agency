import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminAnalyticsService } from '@/services/admin-analytics.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Card, Loading, SectionLabel, Stat, StatRow } from '@/components/backoffice/ui';
import { formatMoney } from '@/utils/money';

import { t, tl, jsLocale } from '@/i18n';

type Competitor = {
  name: string;
  description?: string;
  market_share?: number;
  rating?: number;
  total_reviews?: number;
  price_range_min?: number;
  price_range_max?: number;
  fleet_size?: number;
  cities_covered?: string[];
};

type Benchmark = { category: string; toubcar_price: number; competitors: { name: string; price: number; difference_percentage: number; advantage: string }[] };

/**
 * Competitors (website: Concurrents): the market's main renters next to ToubCar, the price comparison by category
 * (with ToubCar's prices as customers pay them, commission included), the SWOT and the recommendations.
 */
export default function AdminCompetitorsScreen() {
  const overview = useQuery({ queryKey: ['admin-competitors'], queryFn: () => adminAnalyticsService.competitors() });
  const pricing = useQuery({ queryKey: ['admin-competitors-pricing'], queryFn: () => adminAnalyticsService.pricingBenchmark() });

  const data = overview.data;
  const stats = (data?.toubcar_stats ?? {}) as { total_cars?: number; total_agencies?: number; average_rating?: number; price_range?: { min: number; max: number; avg: number } };
  const competitors = (data?.competitors ?? []) as Competitor[];
  const swot = data?.swot ?? {};
  const benchmark = ((pricing.data?.data ?? []) as unknown as Benchmark[]).filter((b) => b.toubcar_price > 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Concurrents')} subtitle={t('Le marché de la location au Maroc')} />
      {overview.isLoading || !data ? <Loading /> : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => { void overview.refetch(); void pricing.refetch(); }} tintColor={COLORS.primary} />}
        >
          <SectionLabel>ToubCar</SectionLabel>
          <StatRow>
            <Stat label={t('Prix moyen client / jour')} value={formatMoney(stats.price_range?.avg ?? 0)} />
            <Stat label={t('Note moyenne')} value={stats.average_rating ? `${stats.average_rating} ★` : '—'} tone="#B45309" />
          </StatRow>
          <StatRow>
            <Stat label={t('Agences')} value={stats.total_agencies ?? 0} />
            <Stat label={t('Véhicules')} value={stats.total_cars ?? 0} />
          </StatRow>

          <SectionLabel>{t('Concurrents')}</SectionLabel>
          {competitors.map((c) => (
            <Card key={c.name} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.name}>{c.name}</Text>
                {c.market_share ? <Text style={styles.share}>{t(':share % du marché', { share: c.market_share.toLocaleString(jsLocale()) })}</Text> : null}
              </View>
              {c.description ? <Text style={styles.text}>{tl(c.description)}</Text> : null}
              <Text style={styles.meta}>
                {[
                  c.rating ? `${c.rating} ★ (${(c.total_reviews ?? 0).toLocaleString(jsLocale())})` : null,
                  c.price_range_min ? `${formatMoney(c.price_range_min)} – ${formatMoney(c.price_range_max)}` : null,
                  c.fleet_size ? t(':count véhicules', { count: c.fleet_size.toLocaleString(jsLocale()) }) : null,
                  c.cities_covered?.length ? t(':count villes', { count: c.cities_covered.length }) : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          ))}

          {benchmark.length ? (
            <>
              <SectionLabel>{t('Comparaison des prix par catégorie')}</SectionLabel>
              {benchmark.map((b) => (
                <Card key={b.category} style={styles.card}>
                  <View style={styles.head}>
                    <Text style={styles.name}>{tl(b.category)}</Text>
                    <Text style={styles.share}>{t('ToubCar : :price', { price: formatMoney(b.toubcar_price) })}</Text>
                  </View>
                  {b.competitors.map((c) => (
                    <View key={c.name} style={styles.benchRow}>
                      <Text style={styles.text}>{c.name}</Text>
                      <Text style={[styles.diff, { color: c.difference_percentage >= 0 ? '#047857' : '#B91C1C' }]}>
                        {formatMoney(c.price)} ({c.difference_percentage >= 0 ? '+' : ''}{c.difference_percentage.toLocaleString(jsLocale())} %)
                      </Text>
                    </View>
                  ))}
                </Card>
              ))}
            </>
          ) : null}

          <SectionLabel>{t('Analyse SWOT')}</SectionLabel>
          <View style={styles.swot}>
            {([
              ['strengths', t('Forces'), '#047857', '#ECFDF5'],
              ['weaknesses', t('Faiblesses'), '#B91C1C', '#FEF2F2'],
              ['opportunities', t('Opportunités'), '#1D4ED8', '#EFF6FF'],
              ['threats', t('Menaces'), '#B45309', '#FFFBEB'],
            ] as const).map(([key, label, color, bg]) => (
              <View key={key} style={[styles.swotCell, { backgroundColor: bg }]}>
                <Text style={[styles.swotTitle, { color }]}>{label}</Text>
                {(swot[key] ?? []).map((item) => <Text key={item} style={styles.text}>• {tl(item)}</Text>)}
              </View>
            ))}
          </View>

          {data.recommendations?.length ? (
            <>
              <SectionLabel>{t('Recommandations')}</SectionLabel>
              {data.recommendations.map((r, i) => (
                <Card key={i} style={styles.card}>
                  <Text style={styles.name}>{tl(r.recommendation)}</Text>
                  <Text style={styles.meta}>{[tl(r.category), tl(r.priority), tl(r.timeline)].filter(Boolean).join(' · ')}</Text>
                </Card>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48, gap: 10 },
  card: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  share: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  text: { fontSize: 13, color: '#374151', lineHeight: 19 },
  meta: { fontSize: 12, color: '#6B7280' },
  benchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  diff: { fontSize: 13, fontWeight: '700' },
  swot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swotCell: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 12, gap: 4 },
  swotTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
});
