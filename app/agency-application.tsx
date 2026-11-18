import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Badge, Button, Card, Field, Loading, SectionLabel } from '@/components/backoffice/ui';
import {
  agencyApplicationService,
  APPLICATION_FIELDS,
  type ApplicationDocument,
  type ApplicationField,
} from '@/services/agency-application.service';
import type { PickedFile } from '@/services/profile.service';
import { useAuthStore } from '@/store/authStore';
import { serverMessage } from '@/utils/apiError';

import { t } from '@/i18n';

const FIELD_LABELS: Record<ApplicationField, () => string> = {
  agency_name: () => t('Nom de l\'agence'),
  email: () => t('E-mail'),
  phone: () => t('Téléphone'),
  address: () => t('Adresse'),
  city: () => t('Ville'),
  commercial_register_number: () => t('Numéro du registre de commerce'),
  responsable_name: () => t('Nom du responsable'),
  responsable_phone: () => t('Téléphone du responsable'),
  responsable_position: () => t('Poste du responsable'),
  responsable_identity_number: () => t('Numéro d\'identité du responsable'),
};

const DOCUMENT_LABELS: Record<ApplicationDocument, () => string> = {
  commercial_register_doc: () => t('Registre de commerce'),
  identity_doc: () => t('Document d\'identité'),
  tax_doc: () => t('Document fiscal (facultatif)'),
};

const AGENCY_FIELDS: ApplicationField[] = ['agency_name', 'email', 'phone', 'address', 'city', 'commercial_register_number'];
const MANAGER_FIELDS: ApplicationField[] = ['responsable_name', 'responsable_phone', 'responsable_position', 'responsable_identity_number'];

/**
 * A rejected agency corrects its application and sends it back for review, as on the website's "Mise à jour des
 * informations" page. Sending it back is not an attempt: an attempt is counted when ToubCar rejects it.
 */
export default function AgencyApplicationScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fields, setFields] = useState<Record<ApplicationField, string> | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<ApplicationDocument, PickedFile>>>({});

  const { data, isLoading } = useQuery({ queryKey: ['agency-application'], queryFn: () => agencyApplicationService.get() });

  useEffect(() => {
    if (data && !fields) {
      setFields(Object.fromEntries(APPLICATION_FIELDS.map((f) => [f, data.fields[f] ?? ''])) as Record<ApplicationField, string>);
    }
  }, [data, fields]);

  const send = useMutation({
    mutationFn: () => agencyApplicationService.resubmit(fields!, documents),
    onSuccess: (result) => {
      updateUser({ agency: result.user.agency ?? null });
      Alert.alert(t('Demande envoyée'), result.message, [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Vérifiez les informations et réessayez.'))),
  });

  const pick = async (document: ApplicationDocument) => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setDocuments((d) => ({ ...d, [document]: { uri: a.uri, name: a.name ?? `${document}.pdf`, type: a.mimeType ?? 'application/pdf', file: (a as { file?: Blob }).file } }));
  };

  const submit = () => {
    if (!fields) return;
    const missing = APPLICATION_FIELDS.filter((f) => !fields[f]?.trim());
    if (missing.length) {
      Alert.alert(t('Champs requis'), t('Complétez : :fields', { fields: missing.map((f) => FIELD_LABELS[f]()).join(', ') }));
      return;
    }
    send.mutate();
  };

  const field = (name: ApplicationField) => (
    <Field
      key={name}
      label={FIELD_LABELS[name]()}
      value={fields?.[name] ?? ''}
      onChangeText={(v) => setFields((f) => (f ? { ...f, [name]: v } : f))}
      keyboardType={name === 'email' ? 'email-address' : name.includes('phone') ? 'phone-pad' : 'default'}
      autoCapitalize={name === 'email' ? 'none' : 'sentences'}
    />
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Mise à jour des informations')} subtitle={t('Votre demande d\'inscription')} />
      {isLoading || !data || !fields ? <Loading /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Card style={styles.notice}>
              <View style={styles.noticeHead}>
                <Ionicons name="close-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.noticeTitle}>{t('Votre demande d\'inscription a été rejetée')}</Text>
              </View>
              {data.rejection_reason ? (
                <>
                  <Text style={styles.noticeLabel}>{t('Motif')}</Text>
                  <Text style={styles.noticeText}>{data.rejection_reason}</Text>
                </>
              ) : null}
              <Text style={styles.noticeText}>{t('Tentatives restantes : :count', { count: data.attempts_left })}</Text>
              {data.attempts_left === 1 ? <Text style={styles.lastTry}>{t('Attention : c\'est votre dernière tentative !')}</Text> : null}
            </Card>

            {!data.can_resubmit ? (
              <Text style={styles.closed}>{t('Seule une demande rejetée peut être envoyée à nouveau.')}</Text>
            ) : (
              <>
                <SectionLabel>{t('Informations de l\'agence')}</SectionLabel>
                <Card>{AGENCY_FIELDS.map(field)}</Card>

                <SectionLabel>{t('Informations du responsable')}</SectionLabel>
                <Card>{MANAGER_FIELDS.map(field)}</Card>

                <SectionLabel>{t('Documents')}</SectionLabel>
                <Card style={styles.docs}>
                  {(Object.keys(DOCUMENT_LABELS) as ApplicationDocument[]).map((doc) => (
                    <View key={doc} style={styles.docRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.docLabel}>{DOCUMENT_LABELS[doc]()}</Text>
                        {documents[doc]
                          ? <Text style={styles.docFile} numberOfLines={1}>{documents[doc]!.name}</Text>
                          : data.documents[doc] ? <Badge label={t('Document actuel conservé')} color="#047857" bg="#ECFDF5" /> : <Badge label={t('Aucun document')} color="#6B7280" bg="#F3F4F6" />}
                      </View>
                      <TouchableOpacity style={styles.docBtn} onPress={() => void pick(doc)} activeOpacity={0.8}>
                        <Ionicons name="document-attach-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.docBtnText}>{data.documents[doc] || documents[doc] ? t('Remplacer') : t('Choisir un PDF')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Text style={styles.hint}>{t('PDF de 2 Mo maximum. Un document non remplacé est conservé.')}</Text>
                </Card>

                <Button label={t('Mettre à jour et soumettre')} icon="send-outline" onPress={submit} loading={send.isPending} style={{ marginTop: 18 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48 },
  notice: { gap: 6, borderStartWidth: 4, borderStartColor: '#DC2626' },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#991B1B' },
  noticeLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 4 },
  noticeText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  lastTry: { fontSize: 13, fontWeight: '800', color: '#B91C1C' },
  closed: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 24 },
  docs: { gap: 14 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  docFile: { fontSize: 12, color: COLORS.secondary },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  docBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  hint: { fontSize: 11, color: '#9CA3AF' },
});
