import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminContentService, type AdminFaq, type Translated } from '@/services/admin-content.service';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, SwitchRow } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';
import TranslatedField from './TranslatedField';
import { t } from '@/i18n';

type Form = { category: string; question: Translated; answer: Translated; position: number; is_published: boolean };

/** Contenu > FAQ: the questions shown on the website's help page (/faq) and in the app. */
export default function FaqPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-content-faqs'], queryFn: () => adminContentService.faqs() });
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const [form, setForm] = useState<Form>({ category: 'booking', question: {}, answer: {}, position: 0, is_published: true });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const categories = data?.categories ?? [];
  const label = (value: string) => categories.find((c) => c.value === value)?.label ?? value;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-content-faqs'] });
    void queryClient.invalidateQueries({ queryKey: ['content-faq'] });
  };
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const save = useMutation({
    mutationFn: () => adminContentService.saveFaq(editing && editing !== 'new' ? editing.id : null, form),
    onSuccess: () => { setEditing(null); refresh(); },
    onError,
  });
  const remove = useMutation({ mutationFn: (id: number) => adminContentService.deleteFaq(id), onSuccess: refresh, onError });

  const open = (faq: AdminFaq | 'new') => {
    setForm(faq === 'new'
      ? { category: categories[0]?.value ?? 'booking', question: {}, answer: {}, position: (data?.data.length ?? 0) + 1, is_published: true }
      : { category: faq.category, question: faq.question ?? {}, answer: faq.answer ?? {}, position: faq.position, is_published: faq.is_published });
    setEditing(faq);
  };

  const confirmRemove = (faq: AdminFaq) =>
    Alert.alert(t('Supprimer'), t('Supprimer cette question ?'), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => remove.mutate(faq.id) },
    ]);

  if (isLoading) return <Loading />;

  return (
    <>
      <Text style={styles.intro}>{t('Les questions publiées apparaissent sur la page Aide du site (/faq) et dans l\'application.')}</Text>
      <Button label={t('Nouvelle question')} icon="add-circle-outline" onPress={() => open('new')} style={{ marginTop: 10 }} />
      {!data?.data.length ? <Empty text={t('Aucune question.')} icon="help-circle-outline" /> : null}
      {(data?.data ?? []).map((faq) => (
        <Card key={faq.id} style={styles.card}>
          <View style={styles.head}>
            <Badge label={label(faq.category)} color="#1D4ED8" bg="#EFF6FF" />
            <Badge label={faq.is_published ? t('Publiée') : t('Brouillon')} color={faq.is_published ? '#047857' : '#6B7280'} bg={faq.is_published ? '#ECFDF5' : '#F3F4F6'} />
            {!faq.question.en || !faq.question.ar ? <Badge label={t('à traduire')} color="#B45309" bg="#FFFBEB" /> : null}
          </View>
          <Text style={styles.question}>{faq.question.fr}</Text>
          <Text style={styles.answer} numberOfLines={3}>{faq.answer.fr}</Text>
          <View style={styles.actions}>
            <Button label={t('Modifier')} icon="create-outline" variant="secondary" onPress={() => open(faq)} style={styles.action} />
            <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmRemove(faq)} style={styles.action} />
          </View>
        </Card>
      ))}

      <Sheet
        visible={editing !== null}
        title={editing === 'new' ? t('Nouvelle question') : t('Modifier la question')}
        onClose={() => setEditing(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Button label={t('Enregistrer')} onPress={() => save.mutate()} loading={save.isPending} disabled={!form.question.fr?.trim() || !form.answer.fr?.trim()} style={{ flex: 2 }} />
          </>
        )}
      >
        <Text style={styles.label}>{t('Rubrique')}</Text>
        <Chips value={form.category} onChange={(v) => set('category', v)} options={categories} />
        <View style={{ height: 12 }} />
        <TranslatedField label={t('Question')} value={form.question} onChange={(v) => set('question', v)} maxLength={255} />
        <TranslatedField label={t('Réponse')} value={form.answer} onChange={(v) => set('answer', v)} maxLength={3000} multiline />
        <Field label={t('Ordre')} value={String(form.position)} onChangeText={(v) => set('position', Number(v) || 0)} keyboardType="number-pad" />
        <SwitchRow label={t('Publier cette question')} value={form.is_published} onChange={(v) => set('is_published', v)} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  card: { gap: 8, marginTop: 10 },
  head: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  question: { fontSize: 15, fontWeight: '800', color: '#111827' },
  answer: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, paddingVertical: 9 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
});
