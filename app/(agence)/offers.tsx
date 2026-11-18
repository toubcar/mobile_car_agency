import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { marketingService, type SpecialOfferPayload, type SpecialOfferRecord } from '@/services/marketing.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import DateField from '@/components/backoffice/DateField';
import { formatMoney } from '@/utils/money';
import { serverMessage } from '@/utils/apiError';
import { addDays, fromIsoDate, toIsoDate } from '@/utils/dates';

import { t, jsLocale } from '@/i18n';

type Offer = SpecialOfferRecord & { is_running?: boolean };
type Form = {
  name: string; code: string; type: 'percentage' | 'fixed'; discount_value: string;
  start_date: string | null; end_date: string | null; max_usage: string; vehicle_ids: number[]; is_flash: boolean;
};

const emptyForm = (): Form => ({
  name: '', code: '', type: 'percentage', discount_value: '10',
  start_date: toIsoDate(new Date()), end_date: toIsoDate(addDays(new Date(), 30)), max_usage: '0', vehicle_ids: [], is_flash: false,
});

const day = (iso: string) => fromIsoDate(iso).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

/** The agency's offers and promo codes (website: Tarification > Offres spéciales). */
export default function AgencyOffersScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Offer | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['agency-offers'], queryFn: () => marketingService.listOffers() });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['agency-offers'] });
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const payload = (): SpecialOfferPayload => ({
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: form.type,
    discount_value: Number(form.discount_value.replace(',', '.')) || 0,
    start_date: form.start_date ?? '',
    end_date: form.end_date ?? '',
    max_usage: Number(form.max_usage) || 0,
    vehicle_ids: form.vehicle_ids,
    is_flash: form.is_flash,
  });

  const save = useMutation({
    mutationFn: () => (editing && editing !== 'new' ? marketingService.updateOffer(editing.id, payload()) : marketingService.createOffer(payload())),
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const toggle = useMutation({ mutationFn: (id: number) => marketingService.toggleOffer(id), onSuccess: refresh, onError });
  const remove = useMutation({ mutationFn: (id: number) => marketingService.deleteOffer(id), onSuccess: refresh, onError });

  const open = (offer: Offer | 'new') => {
    setForm(offer === 'new' ? emptyForm() : {
      name: offer.name, code: offer.code, type: offer.type, discount_value: String(offer.discount_value),
      start_date: offer.start_date, end_date: offer.end_date, max_usage: String(offer.max_usage ?? 0),
      vehicle_ids: offer.vehicle_ids ?? [], is_flash: offer.offer_type === 'flash',
    });
    setEditing(offer);
  };

  const submit = () => {
    if (!form.name.trim() || !form.code.trim() || !form.start_date || !form.end_date || !form.vehicle_ids.length) {
      Alert.alert(t('Champs requis'), t('Nom, code, dates et au moins un véhicule sont obligatoires.'));
      return;
    }
    save.mutate();
  };

  const toggleCar = (id: number) =>
    set('vehicle_ids', form.vehicle_ids.includes(id) ? form.vehicle_ids.filter((v) => v !== id) : [...form.vehicle_ids, id]);

  const confirmRemove = (offer: Offer) =>
    Alert.alert(t('Supprimer'), t('Supprimer l\'offre « :name » ?', { name: offer.name }), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(offer.id) },
    ]);

  const cars = data?.cars ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Offres spéciales')} subtitle={t('Promotions et codes promo')} />
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Button label={t('Nouvelle offre')} icon="add-circle-outline" onPress={() => open('new')} />
          </View>
        )}
        ListEmptyComponent={isLoading ? <Loading /> : <Empty text={t('Aucune offre pour le moment.')} icon="pricetag-outline" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Badge
                label={!item.is_active ? t('Désactivée') : item.is_running ? t('En cours') : t('Programmée ou terminée')}
                color={!item.is_active ? '#6B7280' : item.is_running ? '#047857' : '#B45309'}
                bg={!item.is_active ? '#F3F4F6' : item.is_running ? '#ECFDF5' : '#FFFBEB'}
              />
            </View>
            <View style={styles.codeRow}>
              <View style={styles.code}><Text style={styles.codeText}>{item.code}</Text></View>
              <Text style={styles.discount}>
                {item.type === 'percentage' ? `−${item.discount_value} %` : `−${formatMoney(item.discount_value)}`}
              </Text>
              {item.offer_type === 'flash' ? <Badge label={t('Flash')} color="#7C3AED" bg="#F5F3FF" /> : null}
            </View>
            <Text style={styles.meta}>{day(item.start_date)} → {day(item.end_date)}</Text>
            <Text style={styles.meta}>
              {t(':count véhicule(s)', { count: item.vehicle_ids?.length ?? 0 })}
              {' · '}
              {item.max_usage > 0 ? t(':used / :max utilisations', { used: item.usage_count, max: item.max_usage }) : t(':used utilisations', { used: item.usage_count })}
            </Text>
            <View style={styles.actions}>
              <Button label={item.is_active ? t('Désactiver') : t('Activer')} variant="secondary" onPress={() => toggle.mutate(item.id)} style={styles.action} />
              <Button label={t('Modifier')} icon="create-outline" variant="ghost" onPress={() => open(item)} style={styles.action} />
              <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmRemove(item)} style={styles.action} />
            </View>
          </Card>
        )}
      />

      <Sheet
        visible={editing !== null}
        title={editing === 'new' ? t('Nouvelle offre') : t('Modifier l\'offre')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={submit} loading={save.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        <Field label={t('Nom de l\'offre')} value={form.name} onChangeText={(v) => set('name', v)} />
        <Field label={t('Code promo')} value={form.code} onChangeText={(v) => set('code', v.toUpperCase())} autoCapitalize="characters" maxLength={50} />
        <Text style={styles.fieldLabel}>{t('Type de remise')}</Text>
        <Chips value={form.type} onChange={(v) => set('type', v)} options={[{ value: 'percentage', label: t('Pourcentage') }, { value: 'fixed', label: t('Montant fixe') }]} />
        <View style={{ height: 12 }} />
        <Field label={form.type === 'percentage' ? t('Remise (%)') : t('Remise (DH)')} value={form.discount_value} onChangeText={(v) => set('discount_value', v)} keyboardType="decimal-pad" />
        <DateField label={t('Début')} value={form.start_date} onChange={(v) => set('start_date', v)} />
        <DateField label={t('Fin')} value={form.end_date} onChange={(v) => set('end_date', v)} />
        <Field label={t('Utilisations maximum (0 = sans limite)')} value={form.max_usage} onChangeText={(v) => set('max_usage', v)} keyboardType="number-pad" />
        <SwitchRow label={t('Offre flash')} value={form.is_flash} onChange={(v) => set('is_flash', v)} />
        <Text style={styles.fieldLabel}>{t('Véhicules concernés')}</Text>
        {cars.length ? cars.map((car) => {
          const on = form.vehicle_ids.includes(car.id);
          return (
            <TouchableOpacity key={car.id} style={styles.carRow} onPress={() => toggleCar(car.id)} activeOpacity={0.8} accessibilityState={{ checked: on }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? COLORS.primary : '#9CA3AF'} />
              <Text style={styles.carName}>{car.name}{car.registration_number ? ` · ${car.registration_number}` : ''}</Text>
            </TouchableOpacity>
          );
        }) : <Text style={styles.meta}>{t('Ajoutez d\'abord un véhicule.')}</Text>}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  header: { gap: 10, marginBottom: 4 },
  card: { gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.secondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  codeText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  discount: { fontSize: 16, fontWeight: '800', color: '#047857' },
  meta: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  action: { flexGrow: 1, paddingVertical: 9 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  carRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  carName: { flex: 1, fontSize: 14, color: '#111827' },
});
