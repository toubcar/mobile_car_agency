import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminSystemService } from '@/services/admin-system.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';

import { t } from '@/i18n';

const HEALTH_LABELS: Record<string, () => string> = {
  database: () => t('Base de données'),
  storage: () => t('Stockage'),
  cache: () => t('Cache'),
  queue: () => t('File d\'attente'),
  mail: () => t('E-mail'),
};

export default function AdminSystemScreen() {
  const queryClient = useQueryClient();

  const healthQuery = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminSystemService.health(),
  });

  const usersQuery = useQuery({
    queryKey: ['admin-system-users'],
    queryFn: () => adminSystemService.users(),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: 'clear_cache' | 'optimize' | 'maintenance') => {
      if (action === 'clear_cache') await adminSystemService.clearCache();
      else if (action === 'optimize') await adminSystemService.optimize();
      else await adminSystemService.toggleMaintenance();
    },
    onSuccess: (_, action) => {
      Alert.alert(t('Succès'), action === 'maintenance' ? t('Mode maintenance basculé.') : t('Action terminée.'));
      queryClient.invalidateQueries({ queryKey: ['admin-system-health'] });
    },
    onError: () => Alert.alert(t('Erreur'), t('Action impossible.')),
  });

  const health = healthQuery.data;
  const users = usersQuery.data;

  const confirmMaintenance = () => {
    const enabled = Boolean(health?.maintenance?.is_enabled);

    Alert.alert(
      enabled ? t('Rouvrir le site ?') : t('Fermer le site ?'),
      enabled
        ? t('Le site et l\'application redeviendront accessibles à tous.')
        : t('Le site et l\'application seront inaccessibles aux visiteurs. Vous pourrez les rouvrir depuis cet écran.'),
      [
        { text: t('Annuler'), style: 'cancel' },
        { text: enabled ? t('Rouvrir') : t('Fermer le site'), style: enabled ? 'default' : 'destructive', onPress: () => actionMutation.mutate('maintenance') },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Système')} subtitle={t('Santé API, cache, maintenance')} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={healthQuery.isRefetching || usersQuery.isRefetching}
            onRefresh={() => { healthQuery.refetch(); usersQuery.refetch(); }}
          />
        }
      >
        {healthQuery.isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : health ? (
          <>
            <Text style={styles.section}>{t('Santé')}</Text>
            {Object.entries(health.health_checks ?? {}).map(([key, check]) => (
              <View key={key} style={styles.card}>
                <Text style={styles.cardTitle}>{HEALTH_LABELS[key]?.() ?? key}</Text>
                <Text style={[styles.cardSub, { color: check.status === 'healthy' || check.status === 'ok' ? '#065F46' : check.status === 'warning' ? '#92400E' : '#991B1B' }]}>
                  {check.status === 'healthy' || check.status === 'ok' ? t('Opérationnel') : check.status === 'warning' ? t('Attention') : t('Erreur')} — {check.message}
                </Text>
              </View>
            ))}
            {health.maintenance?.is_enabled ? (
              <View style={styles.warn}>
                <Text style={styles.warnTxt}>{t('Maintenance active :')} {health.maintenance.message}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.section}>{t('Actions')}</Text>
        <View style={styles.actions}>
          <ActionBtn label={t('Vider le cache')} onPress={() => actionMutation.mutate('clear_cache')} />
          <ActionBtn label={t('Optimiser')} onPress={() => actionMutation.mutate('optimize')} />
          <ActionBtn label={t('Maintenance')} onPress={confirmMaintenance} danger />
        </View>

        {users ? (
          <>
            <Text style={styles.section}>{t('Admins (')}{users.admins?.length ?? 0})</Text>
            {(users.admins ?? []).map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.cardTitle}>{a.name}</Text>
                <Text style={styles.cardSub}>{a.email}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionBtn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, danger && styles.actionDanger]} onPress={onPress}>
      <Text style={[styles.actionTxt, danger && { color: '#991B1B' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 4 },
  warn: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 12 },
  warnTxt: { color: '#92400E', fontSize: 13 },
  actions: { gap: 8, marginBottom: 16 },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  actionDanger: { backgroundColor: '#FEE2E2' },
  actionTxt: { color: '#FFF', fontWeight: '700' },
});
