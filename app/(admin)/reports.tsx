import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminAnalyticsService } from '@/services/admin-analytics.service';
import { exportsService, type AdminExportType } from '@/services/exports.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Button, Card, Loading, SectionLabel, Stat, StatRow } from '@/components/backoffice/ui';
import DateField from '@/components/backoffice/DateField';
import { serverMessage } from '@/utils/apiError';
import { openInBrowser } from '@/utils/openLink';

import { t, jsLocale } from '@/i18n';

const EXPORTS: { type: AdminExportType; label: () => string; icon: React.ComponentProps<typeof Button>['icon'] }[] = [
  { type: 'bookings', label: () => t('Réservations'), icon: 'calendar-outline' },
  { type: 'commissions', label: () => t('Commissions'), icon: 'pie-chart-outline' },
  { type: 'transactions', label: () => t('Transactions'), icon: 'swap-vertical-outline' },
  { type: 'agencies', label: () => t('Agences'), icon: 'business-outline' },
  { type: 'customers', label: () => t('Clients'), icon: 'people-outline' },
  { type: 'vehicles', label: () => t('Véhicules'), icon: 'car-outline' },
];

/**
 * The admin's reports (website: Rapports): the platform's figures and the CSV exports, opened in the browser
 * through a link valid 10 minutes (UTF-8 files that open in Excel with their accents and Arabic).
 */
export default function AdminReportsScreen() {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['admin-reports'], queryFn: () => adminAnalyticsService.reportsOverview() });

  const exportCsv = useMutation({
    mutationFn: (type: AdminExportType) => exportsService.adminLink(type, { date_from: from ?? undefined, date_to: to ?? undefined }),
    onSuccess: (url) => void openInBrowser(url),
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('L\'export n\'a pas pu être préparé.'))),
  });

  const n = (v: unknown) => Number(v ?? 0).toLocaleString(jsLocale());

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Rapports et exports')} subtitle={t('Les chiffres de la plateforme')} />
      {isLoading || !data ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}>
          <StatRow>
            <Stat label={t('Agences')} value={n(data.overview.total_agencies)} />
            <Stat label={t('Clients')} value={n(data.overview.total_customers)} />
            <Stat label={t('Véhicules')} value={n(data.overview.total_vehicles)} />
          </StatRow>
          <StatRow>
            <Stat label={t('Réservations')} value={n(data.overview.total_bookings)} />
            <Stat label={t('En cours')} value={n(data.performance.active_bookings)} tone="#1D4ED8" />
            <Stat label={t('Terminées')} value={n(data.performance.completed_bookings)} tone="#047857" />
          </StatRow>
          <StatRow>
            <Stat label={t('Agences approuvées')} value={n(data.performance.agencies_approved)} />
            <Stat label={t('Véhicules disponibles')} value={n(data.performance.available_vehicles)} />
            <Stat label={t('En maintenance')} value={n(data.performance.maintenance_vehicles)} tone="#B45309" />
          </StatRow>

          <SectionLabel>{t('Exports CSV')}</SectionLabel>
          <Card>
            <Text style={styles.intro}>{t('Choisissez une période (facultatif), puis le fichier à télécharger.')}</Text>
            <DateField label={t('Du')} value={from} onChange={setFrom} optional />
            <DateField label={t('Au')} value={to} onChange={setTo} optional />
            <View style={styles.grid}>
              {EXPORTS.map((e) => (
                <Button
                  key={e.type}
                  label={e.label()}
                  icon={e.icon}
                  variant="secondary"
                  onPress={() => exportCsv.mutate(e.type)}
                  loading={exportCsv.isPending && exportCsv.variables === e.type}
                  style={styles.exportBtn}
                />
              ))}
            </View>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48, gap: 10 },
  intro: { fontSize: 12, color: '#6B7280', marginBottom: 10, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  exportBtn: { flexBasis: '47%', flexGrow: 1 },
});
