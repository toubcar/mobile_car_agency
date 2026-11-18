import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { categoriesService, CATEGORY_ICONS, type AgencyCategory } from '@/services/categories.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';

import { t } from '@/i18n';

const COLORS_CHOICE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'];

const iconLabel = (icon: string) => ({
  car: t('Voiture'), suv: 'SUV', luxury: t('Luxe'), economy: t('Économique'), hatchback: t('Hatchback'),
  sedan: t('Sedan'), convertible: t('Cabriolet'), truck: t('Camion'),
}[icon] ?? icon);

type Form = { name: string; description: string; icon: string; color: string; is_active: boolean; sort_order: string };
const emptyForm = (): Form => ({ name: '', description: '', icon: 'car', color: COLORS_CHOICE[0], is_active: true, sort_order: '0' });

/**
 * Car categories (website: Flotte > Catégories). Every agency uses the same list, which also feeds the search filters:
 * an agency adds the ones it misses and changes or deletes only those it created.
 */
export default function AgencyCategoriesScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AgencyCategory | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['agency-categories'], queryFn: () => categoriesService.list() });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['agency-categories'] });
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const payload = () => ({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    icon: form.icon,
    color: form.color,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  });
  const save = useMutation({
    mutationFn: () => (editing && editing !== 'new' ? categoriesService.update(editing.id, payload()) : categoriesService.create(payload())),
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const remove = useMutation({ mutationFn: (id: number) => categoriesService.remove(id), onSuccess: refresh, onError });

  const open = (category: AgencyCategory | 'new') => {
    setForm(category === 'new' ? emptyForm() : {
      name: category.name, description: category.description ?? '', icon: category.icon ?? 'car',
      color: category.color ?? COLORS_CHOICE[0], is_active: category.is_active, sort_order: String(category.sort_order ?? 0),
    });
    setEditing(category);
  };

  const confirmRemove = (category: AgencyCategory) =>
    Alert.alert(t('Supprimer'), t('Supprimer la catégorie « :name » ?', { name: category.label }), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(category.id) },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Catégories')} subtitle={t('Les catégories de vos véhicules')} />
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={COLORS.primary} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.intro}>
              {t('Toutes les agences utilisent ces catégories, qui servent aussi aux filtres de recherche. Ajoutez celles qui vous manquent : seule l\'agence qui a créé une catégorie peut la modifier.')}
            </Text>
            <Button label={t('Nouvelle catégorie')} icon="add-circle-outline" onPress={() => open('new')} />
          </View>
        )}
        ListEmptyComponent={isLoading ? <Loading /> : <Empty text={t('Aucune catégorie.')} icon="pricetags-outline" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.swatch, { backgroundColor: `${item.color ?? '#3B82F6'}22`, borderColor: item.color ?? '#3B82F6' }]}>
                <Ionicons name="car-sport-outline" size={18} color={item.color ?? '#3B82F6'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.label}</Text>
                {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
              </View>
              <View style={styles.count}>
                <Text style={styles.countValue}>{item.cars_count}</Text>
                <Text style={styles.countLabel}>{t('véhicules')}</Text>
              </View>
            </View>
            <View style={styles.badges}>
              {!item.is_active ? <Badge label={t('Inactive')} color="#B91C1C" bg="#FEF2F2" /> : <Badge label={t('Active')} color="#047857" bg="#ECFDF5" />}
              <Badge label={item.editable ? t('Créée par votre agence') : t('Liste ToubCar')} color="#374151" bg="#F3F4F6" />
            </View>
            {item.editable ? (
              <View style={styles.actions}>
                <Button label={t('Modifier')} icon="create-outline" variant="secondary" onPress={() => open(item)} style={styles.action} />
                <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmRemove(item)} style={styles.action} />
              </View>
            ) : null}
          </Card>
        )}
      />

      <Sheet
        visible={editing !== null}
        title={editing === 'new' ? t('Nouvelle catégorie') : t('Modifier la catégorie')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()} style={{ flex: 2 }} />
          </>
        )}
      >
        <Field label={t('Nom')} value={form.name} onChangeText={(v) => set('name', v)} maxLength={255} />
        <Field label={t('Description')} value={form.description} onChangeText={(v) => set('description', v)} multiline maxLength={1000} />
        <Text style={styles.fieldLabel}>{t('Icône')}</Text>
        <Chips value={form.icon} onChange={(v) => set('icon', v)} options={CATEGORY_ICONS.map((icon) => ({ value: icon, label: iconLabel(icon) }))} />
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{t('Couleur')}</Text>
        <View style={styles.colors}>
          {COLORS_CHOICE.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => set('color', color)}
              style={[styles.colorDot, { backgroundColor: color }, form.color === color && styles.colorOn]}
              accessibilityLabel={color}
              accessibilityState={{ selected: form.color === color }}
            />
          ))}
        </View>
        <Field label={t('Ordre')} value={form.sort_order} onChangeText={(v) => set('sort_order', v)} keyboardType="number-pad" />
        <SwitchRow label={t('Active')} value={form.is_active} onChange={(v) => set('is_active', v)} />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  header: { gap: 10, marginBottom: 4 },
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: '#111827' },
  description: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  count: { alignItems: 'center' },
  countValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  countLabel: { fontSize: 10, color: '#6B7280' },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, paddingVertical: 9 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorOn: { borderWidth: 3, borderColor: '#111827' },
});
