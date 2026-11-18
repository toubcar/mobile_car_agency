import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminContentService, type AdminBanner, type BannerForm } from '@/services/admin-content.service';
import { Badge, Button, Card, Empty, Field, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import DateField from '@/components/backoffice/DateField';
import { serverMessage } from '@/utils/apiError';
import TranslatedField from './TranslatedField';
import { t } from '@/i18n';

const emptyForm = (position: number): BannerForm => ({
  title: {}, subtitle: {}, button_label: {}, link: '', position, is_active: true, starts_at: null, ends_at: null, image: null, remove_image: false,
});

/** Contenu > Bannières: the slides of the home page of the website and of the app, in this order. */
export default function BannersPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-content-banners'], queryFn: () => adminContentService.banners() });
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm(0));
  const set = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-content-banners'] });
    void queryClient.invalidateQueries({ queryKey: ['content-banners'] });
  };
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const save = useMutation({
    mutationFn: () => adminContentService.saveBanner(editing && editing !== 'new' ? editing.id : null, form),
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const remove = useMutation({ mutationFn: (id: number) => adminContentService.deleteBanner(id), onSuccess: refresh, onError });
  const toggle = useMutation({
    mutationFn: (banner: AdminBanner) => adminContentService.saveBanner(banner.id, { ...formOf(banner), is_active: !banner.is_active }),
    onSuccess: refresh,
    onError,
  });

  const open = (banner: AdminBanner | 'new') => {
    setForm(banner === 'new' ? emptyForm((data?.length ?? 0) + 1) : formOf(banner));
    setEditing(banner);
  };

  const pickImage = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    set('image', { uri: a.uri, name: a.name ?? 'banner.jpg', type: a.mimeType ?? 'image/jpeg', file: (a as { file?: Blob }).file });
    set('remove_image', false);
  };

  const confirmRemove = (banner: AdminBanner) =>
    Alert.alert(t('Supprimer'), t('Supprimer cette bannière ?'), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(banner.id) },
    ]);

  if (isLoading) return <Loading />;
  const currentImage = editing && editing !== 'new' && !form.remove_image ? editing.image_url : null;

  return (
    <>
      <Text style={styles.intro}>{t('Les bannières actives s\'affichent sur la page d\'accueil du site et de l\'application, dans cet ordre.')}</Text>
      <Button label={t('Nouvelle bannière')} icon="add-circle-outline" onPress={() => open('new')} style={{ marginTop: 10 }} />
      {!data?.length ? <Empty text={t('Aucune bannière.')} icon="images-outline" /> : null}
      {(data ?? []).map((banner) => (
        <Card key={banner.id} style={styles.card}>
          {banner.image_url ? <Image source={{ uri: banner.image_url }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={2}>{banner.title.fr ?? '—'}</Text>
            <Badge label={banner.is_active ? t('Affichée') : t('Masquée')} color={banner.is_active ? '#047857' : '#6B7280'} bg={banner.is_active ? '#ECFDF5' : '#F3F4F6'} />
          </View>
          <Text style={styles.meta}>{[t('Ordre :position', { position: banner.position }), banner.link, banner.starts_at && `${banner.starts_at} → ${banner.ends_at ?? '…'}`].filter(Boolean).join(' · ')}</Text>
          <View style={styles.actions}>
            <Button label={banner.is_active ? t('Masquer') : t('Afficher')} variant="secondary" onPress={() => toggle.mutate(banner)} style={styles.action} />
            <Button label={t('Modifier')} icon="create-outline" variant="ghost" onPress={() => open(banner)} style={styles.action} />
            <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmRemove(banner)} style={styles.action} />
          </View>
        </Card>
      ))}

      <Sheet
        visible={editing !== null}
        title={editing === 'new' ? t('Nouvelle bannière') : t('Modifier la bannière')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={() => save.mutate()} loading={save.isPending} disabled={!form.title.fr?.trim()} style={{ flex: 2 }} />
          </>
        )}
      >
        <TranslatedField label={t('Titre')} value={form.title} onChange={(v) => set('title', v)} maxLength={120} />
        <TranslatedField label={t('Texte')} value={form.subtitle} onChange={(v) => set('subtitle', v)} maxLength={255} multiline />
        <TranslatedField label={t('Texte du bouton')} value={form.button_label} onChange={(v) => set('button_label', v)} maxLength={40} />
        <Field
          label={t('Lien')}
          value={form.link}
          onChangeText={(v) => set('link', v)}
          autoCapitalize="none"
          placeholder="/cars/search"
          hint={t('Une page du site (par exemple /cars/search ou /faq) ou une adresse web complète (https://...).')}
        />
        <Text style={styles.label}>{t('Image (facultative)')}</Text>
        {form.image ? <Image source={{ uri: form.image.uri }} style={styles.preview} contentFit="cover" /> : currentImage ? <Image source={{ uri: currentImage }} style={styles.preview} contentFit="cover" /> : null}
        <View style={styles.imageActions}>
          <TouchableOpacity onPress={() => void pickImage()} style={styles.linkBtn}><Text style={styles.linkText}>{t('Choisir une image')}</Text></TouchableOpacity>
          {(form.image || currentImage) ? (
            <TouchableOpacity onPress={() => { set('image', null); set('remove_image', !!currentImage); }} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: '#B91C1C' }]}>{t('Retirer l\'image')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.hint}>{t('Format paysage conseillé (1600 × 600), 4 Mo maximum. Sans image, un fond de couleur est utilisé.')}</Text>
        <Field label={t('Ordre')} value={String(form.position)} onChangeText={(v) => set('position', Number(v) || 0)} keyboardType="number-pad" />
        <DateField label={t('Début (facultatif)')} value={form.starts_at} onChange={(v) => set('starts_at', v)} optional />
        <DateField label={t('Fin (facultative)')} value={form.ends_at} onChange={(v) => set('ends_at', v)} optional />
        <SwitchRow label={t('Afficher cette bannière')} value={form.is_active} onChange={(v) => set('is_active', v)} />
      </Sheet>
    </>
  );
}

function formOf(banner: AdminBanner): BannerForm {
  return {
    title: banner.title ?? {}, subtitle: banner.subtitle ?? {}, button_label: banner.button_label ?? {},
    link: banner.link ?? '', position: banner.position ?? 0, is_active: banner.is_active,
    starts_at: banner.starts_at ?? null, ends_at: banner.ends_at ?? null, image: null, remove_image: false,
  };
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 8, marginTop: 10 },
  thumb: { height: 90, borderRadius: 12, backgroundColor: COLORS.primary },
  thumbEmpty: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, paddingVertical: 9 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  preview: { height: 110, borderRadius: 12, marginBottom: 8 },
  imageActions: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  hint: { fontSize: 11, color: '#9CA3AF', marginBottom: 12 },
});
