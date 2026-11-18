import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { externalSitesService, type ExternalSiteRecord } from '@/services/external-sites.service';
import { carsService } from '@/services/cars.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';
import { openInBrowser } from '@/utils/openLink';

import { t } from '@/i18n';

type Site = ExternalSiteRecord & { car?: { id: number; name: string } | null };
type Form = { car_id: number | null; site_name: string; site_url: string; api_url: string; api_token: string; external_car_id: string; is_active: boolean; notes: string };

const emptyForm = (): Form => ({ car_id: null, site_name: '', site_url: 'https://', api_url: 'https://', api_token: '', external_car_id: '', is_active: true, notes: '' });

/**
 * The other websites where the agency also rents its cars (website: a car's "Sites externes"): ToubCar asks their API
 * whether the car is free before taking a booking, so a car rented elsewhere is not booked twice.
 */
export default function AgencyExternalSitesScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Site | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['agency-external-sites'], queryFn: () => externalSitesService.list() });
  const cars = useQuery({ queryKey: ['agency-fleet-all'], queryFn: () => carsService.listOwn(), enabled: editing === 'new' });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['agency-external-sites'] });
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        site_name: form.site_name.trim(),
        site_url: form.site_url.trim(),
        api_url: form.api_url.trim(),
        api_token: form.api_token.trim() || undefined,
        external_car_id: form.external_car_id.trim() || undefined,
        is_active: form.is_active,
        notes: form.notes.trim() || undefined,
      };
      return editing && editing !== 'new'
        ? externalSitesService.update(editing.id, payload)
        : externalSitesService.create(form.car_id ?? 0, payload);
    },
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const toggle = useMutation({ mutationFn: (id: number) => externalSitesService.toggle(id), onSuccess: refresh, onError });
  const remove = useMutation({ mutationFn: (id: number) => externalSitesService.delete(id), onSuccess: refresh, onError });

  const open = (site: Site | 'new') => {
    setForm(site === 'new' ? emptyForm() : {
      car_id: site.car_id, site_name: site.site_name, site_url: site.site_url, api_url: site.api_url,
      api_token: '', external_car_id: site.external_car_id ?? '', is_active: site.is_active, notes: site.notes ?? '',
    });
    setEditing(site);
  };

  const submit = () => {
    if ((editing === 'new' && !form.car_id) || !form.site_name.trim() || form.site_url.trim().length < 10 || form.api_url.trim().length < 10) {
      Alert.alert(t('Champs requis'), t('Véhicule, nom du site, adresse du site et adresse de l\'API sont obligatoires.'));
      return;
    }
    save.mutate();
  };

  const confirmRemove = (site: Site) =>
    Alert.alert(t('Supprimer'), t('Supprimer le site « :name » ?', { name: site.site_name }), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(site.id) },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Sites externes')} subtitle={t('Vos véhicules loués ailleurs')} />
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.intro}>
              {t('Si vous louez aussi un véhicule sur un autre site, ToubCar vérifie auprès de ce site qu\'il est libre avant d\'accepter une réservation.')}
            </Text>
            <Button label={t('Ajouter un site')} icon="add-circle-outline" onPress={() => open('new')} />
          </View>
        )}
        ListEmptyComponent={isLoading ? <Loading /> : <Empty text={t('Aucun site externe.')} icon="globe-outline" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name} numberOfLines={1}>{item.site_name}</Text>
              <Badge label={item.is_active ? t('Actif') : t('Désactivé')} color={item.is_active ? '#047857' : '#6B7280'} bg={item.is_active ? '#ECFDF5' : '#F3F4F6'} />
            </View>
            <Text style={styles.meta}>{item.car?.name ?? `#${item.car_id}`}{item.external_car_id ? ` · ${t('Réf. :ref', { ref: item.external_car_id })}` : ''}</Text>
            <Text style={styles.link} numberOfLines={1} onPress={() => void openInBrowser(item.site_url)}>{item.site_url}</Text>
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
        title={editing === 'new' ? t('Ajouter un site') : t('Modifier le site')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={submit} loading={save.isPending} style={{ flex: 2 }} />
          </>
        )}
      >
        {editing === 'new' ? (
          <>
            <Text style={styles.fieldLabel}>{t('Véhicule')}</Text>
            {cars.isLoading ? <Loading /> : (
              <Chips
                value={form.car_id ? String(form.car_id) : ''}
                onChange={(v) => set('car_id', Number(v))}
                options={(cars.data ?? []).map((c) => ({ value: String(c.id), label: `${c.brand} ${c.model}${c.registration_number ? ` · ${c.registration_number}` : ''}` }))}
              />
            )}
            <View style={{ height: 12 }} />
          </>
        ) : null}
        <Field label={t('Nom du site')} value={form.site_name} onChangeText={(v) => set('site_name', v)} />
        <Field label={t('Adresse du site')} value={form.site_url} onChangeText={(v) => set('site_url', v)} autoCapitalize="none" keyboardType="url" />
        <Field label={t('Adresse de l\'API')} value={form.api_url} onChangeText={(v) => set('api_url', v)} autoCapitalize="none" keyboardType="url" hint={t('Adresse publique (https) que ToubCar interroge pour savoir si le véhicule est libre.')} />
        <Field label={t('Jeton de l\'API (facultatif)')} value={form.api_token} onChangeText={(v) => set('api_token', v)} autoCapitalize="none" secureTextEntry hint={editing !== 'new' ? t('Laissez vide pour garder le jeton actuel.') : undefined} />
        <Field label={t('Référence du véhicule sur ce site (facultatif)')} value={form.external_car_id} onChangeText={(v) => set('external_car_id', v)} autoCapitalize="none" />
        <Field label={t('Notes')} value={form.notes} onChangeText={(v) => set('notes', v)} multiline />
        <SwitchRow label={t('Actif')} value={form.is_active} onChange={(v) => set('is_active', v)} />
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
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  link: { fontSize: 13, color: COLORS.secondary, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  action: { flexGrow: 1, paddingVertical: 9 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
});
