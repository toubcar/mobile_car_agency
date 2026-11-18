import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { maintenanceService, type MaintenancePayload, type MaintenanceRecord } from '@/services/maintenance.service';
import { carsService } from '@/services/cars.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, Stat, StatRow } from '@/components/backoffice/ui';
import DateField from '@/components/backoffice/DateField';
import { formatMoney } from '@/utils/money';
import { serverMessage } from '@/utils/apiError';
import { fromIsoDate, toIsoDate } from '@/utils/dates';

import { t, jsLocale } from '@/i18n';

type Status = MaintenanceRecord['status'];
type Type = MaintenanceRecord['type'];

const STATUS_LOOK: Record<Status, { color: string; bg: string }> = {
  scheduled: { color: '#B45309', bg: '#FFFBEB' },
  in_progress: { color: '#B91C1C', bg: '#FEF2F2' },
  completed: { color: '#047857', bg: '#ECFDF5' },
  cancelled: { color: '#6B7280', bg: '#F3F4F6' },
};

const statusLabel = (s: Status) => ({ scheduled: t('Planifiée'), in_progress: t('En cours'), completed: t('Terminée'), cancelled: t('Annulée') }[s]);
const typeLabel = (s: Type) => ({ routine: t('Routine'), repair: t('Réparation'), inspection: t('Inspection'), emergency: t('Urgence'), other: t('Autre') }[s]);

type Form = {
  car_id: number | null; title: string; type: Type; status: Status;
  scheduled_date: string | null; start_date: string | null; end_date: string | null;
  cost: string; garage_name: string; garage_contact: string; mileage_at_service: string; description: string; notes: string;
};

const emptyForm = (): Form => ({
  car_id: null, title: '', type: 'routine', status: 'scheduled',
  scheduled_date: toIsoDate(new Date()), start_date: null, end_date: null,
  cost: '', garage_name: '', garage_contact: '', mileage_at_service: '', description: '', notes: '',
});

function formOf(m: MaintenanceRecord): Form {
  return {
    car_id: m.car_id, title: m.title, type: m.type, status: m.status,
    scheduled_date: m.scheduled_date ?? null, start_date: m.start_date ?? null, end_date: m.end_date ?? null,
    cost: m.cost ? String(m.cost) : '', garage_name: m.garage_name ?? '', garage_contact: m.garage_contact ?? '',
    mileage_at_service: m.mileage_at_service != null ? String(m.mileage_at_service) : '', description: m.description ?? '', notes: m.notes ?? '',
  };
}

function payloadOf(f: Form): MaintenancePayload {
  const number = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));
  return {
    car_id: f.car_id ?? 0,
    title: f.title.trim(),
    type: f.type,
    status: f.status,
    scheduled_date: f.scheduled_date ?? '',
    start_date: f.start_date,
    end_date: f.end_date,
    cost: number(f.cost),
    garage_name: f.garage_name.trim() || undefined,
    garage_contact: f.garage_contact.trim() || undefined,
    mileage_at_service: number(f.mileage_at_service),
    description: f.description.trim() || undefined,
    notes: f.notes.trim() || undefined,
  };
}

const day = (iso?: string | null) => (iso ? fromIsoDate(iso).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : null);

/**
 * The agency's maintenance (website: Flotte > Maintenance). The days of a planned or running maintenance are taken off
 * the car's calendar: customers cannot book it then, and it stays bookable before and after.
 */
export default function AgencyMaintenanceScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [editing, setEditing] = useState<MaintenanceRecord | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const query = useInfiniteQuery({
    queryKey: ['agency-maintenance', filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => maintenanceService.list({ page: pageParam, per_page: 20, status: filter === 'all' ? undefined : filter }),
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  });
  const cars = useQuery({ queryKey: ['agency-fleet-all'], queryFn: () => carsService.listOwn(), enabled: editing !== null });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['agency-maintenance'] });
    void queryClient.invalidateQueries({ queryKey: ['car-availability'] });
  };
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const save = useMutation({
    mutationFn: () => (editing && editing !== 'new' ? maintenanceService.update(editing.id, payloadOf(form)) : maintenanceService.create(payloadOf(form))),
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => maintenanceService.updateStatus(id, status),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({ mutationFn: (id: number) => maintenanceService.remove(id), onSuccess: refresh, onError });

  const open = (record: MaintenanceRecord | 'new') => {
    setForm(record === 'new' ? emptyForm() : formOf(record));
    setEditing(record);
  };

  const submit = () => {
    if (!form.car_id || !form.title.trim() || !form.scheduled_date) {
      Alert.alert(t('Champs requis'), t('Choisissez le véhicule, le titre et la date prévue.'));
      return;
    }
    save.mutate();
  };

  const confirmRemove = (m: MaintenanceRecord) =>
    Alert.alert(t('Supprimer'), t('Supprimer cette maintenance ?'), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(m.id) },
    ]);

  const stats = query.data?.pages[0]?.statistics;
  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Maintenance')} subtitle={t('Entretien et réparations de vos véhicules')} />
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={COLORS.primary} />}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={(
          <View style={styles.header}>
            {stats ? (
              <>
                <StatRow>
                  <Stat label={t('En cours')} value={stats.in_progress} tone="#B91C1C" />
                  <Stat label={t('Planifiées')} value={stats.scheduled} tone="#B45309" />
                  <Stat label={t('Terminées')} value={stats.completed} tone="#047857" />
                </StatRow>
                <StatRow>
                  <Stat label={t('Coût des maintenances terminées')} value={formatMoney(stats.total_cost)} />
                </StatRow>
              </>
            ) : null}
            <Text style={styles.intro}>
              {t('Les jours d\'une maintenance planifiée ou en cours sont retirés du calendrier du véhicule : il reste réservable avant et après.')}
            </Text>
            <Button label={t('Planifier une maintenance')} icon="add-circle-outline" onPress={() => open('new')} />
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('Toutes') },
                { value: 'scheduled', label: t('Planifiées') },
                { value: 'in_progress', label: t('En cours') },
                { value: 'completed', label: t('Terminées') },
                { value: 'cancelled', label: t('Annulées') },
              ]}
            />
          </View>
        )}
        ListEmptyComponent={query.isLoading ? <Loading /> : <Empty text={t('Aucune maintenance.')} icon="construct-outline" />}
        ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
        renderItem={({ item }) => {
          const look = STATUS_LOOK[item.status];
          const period = [day(item.start_date ?? item.scheduled_date), item.end_date ? day(item.end_date) : null].filter(Boolean).join(' → ');
          return (
            <Card style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.car?.name ?? `#${item.car_id}`}</Text>
                <Badge label={item.status_label ?? statusLabel(item.status)} color={look.color} bg={look.bg} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{[item.type_label ?? typeLabel(item.type), period].filter(Boolean).join(' · ')}</Text>
              {item.garage_name || item.cost ? (
                <Text style={styles.meta}>{[item.garage_name, item.cost ? formatMoney(item.cost, { decimals: 2 }) : null].filter(Boolean).join(' · ')}</Text>
              ) : null}
              <View style={styles.actions}>
                {item.status === 'scheduled' ? (
                  <Button label={t('Commencer')} icon="play-outline" variant="secondary" onPress={() => changeStatus.mutate({ id: item.id, status: 'in_progress' })} style={styles.action} />
                ) : null}
                {item.status === 'scheduled' || item.status === 'in_progress' ? (
                  <Button label={t('Terminer')} icon="checkmark-done-outline" onPress={() => changeStatus.mutate({ id: item.id, status: 'completed' })} style={styles.action} />
                ) : null}
                <Button label={t('Modifier')} icon="create-outline" variant="ghost" onPress={() => open(item)} style={styles.action} />
                <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmRemove(item)} style={styles.action} />
              </View>
            </Card>
          );
        }}
      />

      <Sheet
        visible={editing !== null}
        title={editing === 'new' ? t('Planifier une maintenance') : t('Modifier la maintenance')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={submit} loading={save.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        <Text style={styles.fieldLabel}>{t('Véhicule')}</Text>
        {cars.isLoading ? <Loading /> : (
          <Chips
            value={form.car_id ? String(form.car_id) : ''}
            onChange={(v) => set('car_id', Number(v))}
            options={(cars.data ?? []).map((c) => ({ value: String(c.id), label: `${c.brand} ${c.model}${c.registration_number ? ` · ${c.registration_number}` : ''}` }))}
          />
        )}
        <View style={{ height: 12 }} />
        <Field label={t('Titre')} value={form.title} onChangeText={(v) => set('title', v)} placeholder={t('Vidange, pneus, contrôle technique…')} />
        <Text style={styles.fieldLabel}>{t('Type')}</Text>
        <Chips value={form.type} onChange={(v) => set('type', v)} options={(['routine', 'repair', 'inspection', 'emergency', 'other'] as Type[]).map((v) => ({ value: v, label: typeLabel(v) }))} />
        <View style={{ height: 12 }} />
        <Text style={styles.fieldLabel}>{t('Statut')}</Text>
        <Chips value={form.status} onChange={(v) => set('status', v)} options={(['scheduled', 'in_progress', 'completed', 'cancelled'] as Status[]).map((v) => ({ value: v, label: statusLabel(v) }))} />
        <View style={{ height: 12 }} />
        <DateField label={t('Date prévue')} value={form.scheduled_date} onChange={(v) => set('scheduled_date', v)} />
        <DateField label={t('Premier jour au garage (facultatif)')} value={form.start_date} onChange={(v) => set('start_date', v)} optional />
        <DateField label={t('Dernier jour au garage (facultatif)')} value={form.end_date} onChange={(v) => set('end_date', v)} optional />
        <Field label={t('Coût (DH)')} value={form.cost} onChangeText={(v) => set('cost', v)} keyboardType="decimal-pad" />
        <Field label={t('Garage')} value={form.garage_name} onChangeText={(v) => set('garage_name', v)} />
        <Field label={t('Contact du garage')} value={form.garage_contact} onChangeText={(v) => set('garage_contact', v)} />
        <Field label={t('Kilométrage')} value={form.mileage_at_service} onChangeText={(v) => set('mileage_at_service', v)} keyboardType="number-pad" />
        <Field label={t('Description')} value={form.description} onChangeText={(v) => set('description', v)} multiline />
        <Field label={t('Notes')} value={form.notes} onChangeText={(v) => set('notes', v)} multiline />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  header: { gap: 10, marginBottom: 4 },
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  action: { flexGrow: 1, paddingVertical: 9 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
});
