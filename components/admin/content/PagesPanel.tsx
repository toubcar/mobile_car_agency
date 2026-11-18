import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminContentService, type AdminPage, type Translated } from '@/services/admin-content.service';
import { Badge, Button, Card, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';
import TranslatedField from './TranslatedField';
import { t, jsLocale } from '@/i18n';

/** Contenu > Pages: terms, privacy, cancellation and legal notice, linked at the bottom of every page and in the app. */
export default function PagesPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-content-pages'], queryFn: () => adminContentService.pages() });
  const [editing, setEditing] = useState<AdminPage | null>(null);
  const [title, setTitle] = useState<Translated>({});
  const [content, setContent] = useState<Translated>({});
  const [published, setPublished] = useState(true);

  const save = useMutation({
    mutationFn: () => adminContentService.savePage(editing!.id, { title, content, is_published: published }),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-content-pages'] });
      void queryClient.invalidateQueries({ queryKey: ['content-page'] });
      void queryClient.invalidateQueries({ queryKey: ['content-pages'] });
      Alert.alert(t('Page enregistrée.'));
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.'))),
  });

  const open = (page: AdminPage) => {
    setTitle(page.title ?? {});
    setContent(page.content ?? {});
    setPublished(page.is_published);
    setEditing(page);
  };

  if (isLoading) return <Loading />;

  return (
    <>
      <Text style={styles.intro}>{t('Ces pages sont liées en bas de chaque page du site, dans le paiement et dans l\'application. Elles s\'écrivent en Markdown.')}</Text>
      {(data ?? []).map((page) => (
        <Card key={page.id} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{page.title.fr}</Text>
            <Badge label={page.is_published ? t('Publiée') : t('Brouillon')} color={page.is_published ? '#047857' : '#6B7280'} bg={page.is_published ? '#ECFDF5' : '#F3F4F6'} />
          </View>
          <Text style={styles.meta}>
            /pages/{page.slug}
            {page.updated_at ? ` · ${t('Modifiée le :date', { date: new Date(page.updated_at).toLocaleDateString(jsLocale()) })}` : ''}
          </Text>
          <View style={styles.actions}>
            <Button label={t('Modifier la page')} icon="create-outline" variant="secondary" onPress={() => open(page)} style={styles.action} />
            <Button label={t('Voir la page')} icon="eye-outline" variant="ghost" onPress={() => router.push(`/pages/${page.slug}` as never)} style={styles.action} />
          </View>
        </Card>
      ))}

      <Sheet
        visible={editing !== null}
        title={t('Modifier la page')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={() => save.mutate()} loading={save.isPending} disabled={!title.fr?.trim() || !content.fr?.trim()} style={{ flex: 2 }} />
          </>
        )}
      >
        <TranslatedField label={t('Titre')} value={title} onChange={setTitle} maxLength={120} />
        <TranslatedField
          label={t('Texte')}
          value={content}
          onChange={setContent}
          multiline
          maxLength={60000}
          hint={t('Markdown : # Titre, ## Sous-titre, **gras**, *italique*, - élément de liste, [texte](/pages/annulation) pour un lien.')}
        />
        <SwitchRow label={t('Publier cette page')} value={published} onChange={setPublished} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 8, marginTop: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, paddingVertical: 9 },
});
