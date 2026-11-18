import { useEffect, useState } from 'react';
import { Alert, Text, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminContentService, type SiteSettings, type Translated } from '@/services/admin-content.service';
import { Button, Card, Field, Loading, SectionLabel } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';
import TranslatedField from './TranslatedField';
import { t } from '@/i18n';

const SOCIALS = [
  ['social_facebook', 'Facebook'],
  ['social_instagram', 'Instagram'],
  ['social_tiktok', 'TikTok'],
  ['social_linkedin', 'LinkedIn'],
  ['social_youtube', 'YouTube'],
] as const;

const asText = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const asTranslated = (v: unknown): Translated => (v && typeof v === 'object' ? (v as Translated) : typeof v === 'string' ? { fr: v } : {});

/** Contenu > Paramètres: contact details, social networks, footer tagline and the default commission rate. */
export default function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-content-settings'], queryFn: () => adminContentService.settings() });
  const [values, setValues] = useState<Record<string, string>>({});
  const [tagline, setTagline] = useState<Translated>({});
  const [address, setAddress] = useState<Translated>({});

  useEffect(() => {
    if (!data) return;
    const plain: Record<string, string> = {};
    for (const key of ['contact_phone', 'contact_whatsapp', 'contact_email', 'default_commission_rate', ...SOCIALS.map(([k]) => k)]) {
      plain[key] = asText(data[key]);
    }
    if (!plain.default_commission_rate) plain.default_commission_rate = '10';
    setValues(plain);
    setTagline(asTranslated(data.site_tagline));
    setAddress(asTranslated(data.contact_address));
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const payload: SiteSettings = { site_tagline: tagline, contact_address: address };
      for (const [key, value] of Object.entries(values)) payload[key] = value.trim() === '' ? null : value.trim();
      payload.default_commission_rate = Number(String(values.default_commission_rate ?? '10').replace(',', '.'));
      return adminContentService.saveSettings(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-content-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      Alert.alert(t('Paramètres enregistrés.'));
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.'))),
  });

  if (isLoading) return <Loading />;
  const set = (key: string) => (v: string) => setValues((s) => ({ ...s, [key]: v }));

  return (
    <>
      <Text style={styles.intro}>{t('Un champ vide garde la valeur du fichier .env du serveur. Le téléphone s\'écrit au format international, par exemple +212 6 12 34 56 78.')}</Text>
      <SectionLabel>{t('Contact')}</SectionLabel>
      <Card>
        <Field label={t('Téléphone')} value={values.contact_phone ?? ''} onChangeText={set('contact_phone')} keyboardType="phone-pad" />
        <Field label={t('WhatsApp')} value={values.contact_whatsapp ?? ''} onChangeText={set('contact_whatsapp')} keyboardType="phone-pad" />
        <Field label={t('E-mail')} value={values.contact_email ?? ''} onChangeText={set('contact_email')} keyboardType="email-address" autoCapitalize="none" />
        <TranslatedField label={t('Adresse ou ville affichée')} value={address} onChange={setAddress} maxLength={255} />
      </Card>
      <SectionLabel>{t('Réseaux sociaux')}</SectionLabel>
      <Card>
        {SOCIALS.map(([key, name]) => (
          <Field key={key} label={name} value={values[key] ?? ''} onChangeText={set(key)} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        ))}
      </Card>
      <SectionLabel>{t('Présentation')}</SectionLabel>
      <Card>
        <TranslatedField label={t('Phrase d\'accroche (pied de page)')} value={tagline} onChange={setTagline} maxLength={255} />
      </Card>
      <SectionLabel>{t('Commission')}</SectionLabel>
      <Card>
        <Field
          label={t('Taux par défaut des nouvelles agences (%)')}
          value={values.default_commission_rate ?? ''}
          onChangeText={set('default_commission_rate')}
          keyboardType="decimal-pad"
          hint={t('Ajouté aux prix des agences pour les clients. Chaque agence a ensuite son propre taux, modifiable dans Finance > Commissions.')}
        />
      </Card>
      <Button label={t('Enregistrer')} onPress={() => save.mutate()} loading={save.isPending} style={{ marginTop: 16 }} />
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
});
