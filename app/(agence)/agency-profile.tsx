import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '@/constants/api';
import { agencyProfileService, type AgencyDocument, type AgencyProfile } from '@/services/agency-profile.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { CITIES, getQuartersForCity } from '@/constants/locations';

import { t, tl } from '@/i18n';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

type Tab = 'general' | 'hours' | 'location' | 'security' | 'documents';

export default function AgencyProfileScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('general');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['agency-profile'],
    queryFn: () => agencyProfileService.get(),
  });

  const [general, setGeneral] = useState({ name: '', registration_number: '', description: '', phone: '', email: '' });
  const [location, setLocation] = useState({
    address: '',
    city: '',
    quartier: '',
    postal_code: '',
    country: 'Maroc',
  });
  const [hours, setHours] = useState<NonNullable<AgencyProfile['opening_hours']>>([]);
  const [security, setSecurity] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [docType, setDocType] = useState<AgencyDocument['type']>('license');

  const quarters = useMemo(() => getQuartersForCity(location.city), [location.city]);

  useEffect(() => {
    if (!profile) return;
    setGeneral({
      name: profile.agency_name ?? '',
      registration_number: profile.registration_number ?? '',
      description: profile.description ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
    });
    setLocation({
      address: profile.address ?? '',
      city: profile.city ?? '',
      quartier: profile.quartier ?? '',
      postal_code: profile.postal_code ?? '',
      country: profile.country ?? 'Maroc',
    });
    if (profile.opening_hours?.length) {
      setHours(profile.opening_hours);
    } else {
      setHours(DAYS.map((day) => ({ day, open_time: '09:00', close_time: '18:00', is_closed: false })));
    }
  }, [profile]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agency-profile'] });

  const saveGeneral = useMutation({
    mutationFn: () => agencyProfileService.updateGeneral(general),
    onSuccess: () => { invalidate(); Alert.alert(t('Succès'), t('Informations mises à jour.')); },
  });

  const saveHours = useMutation({
    mutationFn: () => agencyProfileService.updateOpeningHours(hours),
    onSuccess: () => { invalidate(); Alert.alert(t('Succès'), t('Horaires mis à jour.')); },
  });

  const saveLocation = useMutation({
    mutationFn: () => agencyProfileService.updateLocations(location),
    onSuccess: () => { invalidate(); Alert.alert(t('Succès'), t('Adresse mise à jour.')); },
  });

  const saveSecurity = useMutation({
    mutationFn: () => agencyProfileService.updateSecurity(security),
    onSuccess: () => {
      setSecurity({ current_password: '', new_password: '', new_password_confirmation: '' });
      Alert.alert(t('Succès'), t('Mot de passe mis à jour.'));
    },
    onError: () => Alert.alert(t('Erreur'), t('Vérifiez le mot de passe actuel et la confirmation.')),
  });

  const uploadDoc = useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      agencyProfileService.uploadDocument({ document_type: docType, file }),
    onSuccess: () => { invalidate(); Alert.alert(t('Succès'), t('Document envoyé.')); },
  });

  const deleteDoc = useMutation({
    mutationFn: (index: number) => agencyProfileService.deleteDocument(index),
    onSuccess: invalidate,
  });

  const pickDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    uploadDoc.mutate({ uri: a.uri, name: a.name ?? 'document', type: a.mimeType ?? 'application/octet-stream' });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: t('Général') },
    { key: 'hours', label: t('Horaires') },
    { key: 'location', label: t('Adresse') },
    { key: 'documents', label: t('Docs') },
    { key: 'security', label: t('Sécurité') },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <AdminStackHeader title={t('Profil agence')} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader
        title={t('Profil agence')}
        subtitle={profile?.completion != null ? t(':completion% complété', { completion: profile.completion }) : undefined}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.tab, tab === item.key && styles.tabOn]} onPress={() => setTab(item.key)}>
            <Text style={[styles.tabTxt, tab === item.key && styles.tabTxtOn]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {tab === 'general' ? (
          <>
            <Field label={t("Nom de l'agence")} value={general.name} onChangeText={(v) => setGeneral((g) => ({ ...g, name: v }))} />
            <Field label={t('N° registre')} value={general.registration_number} onChangeText={(v) => setGeneral((g) => ({ ...g, registration_number: v }))} />
            <Field label={t('Téléphone')} value={general.phone} onChangeText={(v) => setGeneral((g) => ({ ...g, phone: v }))} />
            <Field label={t('Email')} value={general.email} onChangeText={(v) => setGeneral((g) => ({ ...g, email: v }))} keyboardType="email-address" />
            <Field label={t('Description')} value={general.description} onChangeText={(v) => setGeneral((g) => ({ ...g, description: v }))} multiline />
            <SaveBtn loading={saveGeneral.isPending} onPress={() => saveGeneral.mutate()} />
          </>
        ) : null}

        {tab === 'hours' ? (
          <>
            {hours.map((h, i) => (
              <View key={h.day} style={styles.hourRow}>
                <Text style={styles.hourDay}>{h.day}</Text>
                <Switch
                  value={!h.is_closed}
                  onValueChange={(v) => {
                    const next = [...hours];
                    next[i] = { ...next[i], is_closed: !v };
                    setHours(next);
                  }}
                />
                <TextInput style={styles.hourInput} value={h.open_time} onChangeText={(v) => {
                  const next = [...hours]; next[i] = { ...next[i], open_time: v }; setHours(next);
                }} />
                <Text style={styles.hourSep}>–</Text>
                <TextInput style={styles.hourInput} value={h.close_time} onChangeText={(v) => {
                  const next = [...hours]; next[i] = { ...next[i], close_time: v }; setHours(next);
                }} />
              </View>
            ))}
            <SaveBtn loading={saveHours.isPending} onPress={() => saveHours.mutate()} />
          </>
        ) : null}

        {tab === 'location' ? (
          <>
            <Field label={t('Adresse')} value={location.address} onChangeText={(v) => setLocation((l) => ({ ...l, address: v }))} />
            <Text style={styles.chipLabel}>{t('Ville')}</Text>
            <View style={styles.chipGrid}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.locChip, location.city === c && styles.locChipOn]}
                  onPress={() =>
                    setLocation((l) => ({
                      ...l,
                      city: c,
                      quartier: l.city === c ? l.quartier : '',
                    }))
                  }
                  activeOpacity={0.75}
                >
                  <Text style={[styles.locChipTxt, location.city === c && styles.locChipTxtOn]}>{tl(c)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.chipLabel}>{t('Quartier')}</Text>
            {!location.city ? (
              <Text style={styles.chipHint}>{t('Choisissez d\'abord une ville.')}</Text>
            ) : (
              <View style={styles.chipGrid}>
                {quarters.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.locChip, location.quartier === q && styles.locChipOn]}
                    onPress={() =>
                      setLocation((l) => ({ ...l, quartier: l.quartier === q ? '' : q }))
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.locChipTxt, location.quartier === q && styles.locChipTxtOn]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Field label={t('Code postal')} value={location.postal_code} onChangeText={(v) => setLocation((l) => ({ ...l, postal_code: v }))} />
            <Field label={t('Pays')} value={location.country} onChangeText={(v) => setLocation((l) => ({ ...l, country: v }))} />
            <SaveBtn loading={saveLocation.isPending} onPress={() => saveLocation.mutate()} />
          </>
        ) : null}

        {tab === 'documents' ? (
          <>
            <View style={styles.docTypes}>
              {(['license', 'insurance', 'registration', 'other'] as const).map((kind) => (
                <TouchableOpacity key={kind} style={[styles.docChip, docType === kind && styles.docChipOn]} onPress={() => setDocType(kind)}>
                  <Text style={[styles.docChipTxt, docType === kind && styles.docChipTxtOn]}>{kind}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickDoc} disabled={uploadDoc.isPending}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadTxt}>{uploadDoc.isPending ? t('Envoi…') : t('Ajouter un document')}</Text>
            </TouchableOpacity>
            {(profile?.documents ?? []).map((doc, idx) => (
              <View key={`${doc.filename}-${idx}`} style={styles.docRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.type} · {doc.filename}</Text>
                  {doc.description ? <Text style={styles.docSub}>{doc.description}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => deleteDoc.mutate(idx)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'security' ? (
          <>
            <Field label={t('Mot de passe actuel')} value={security.current_password} onChangeText={(v) => setSecurity((s) => ({ ...s, current_password: v }))} secure />
            <Field label={t('Nouveau mot de passe')} value={security.new_password} onChangeText={(v) => setSecurity((s) => ({ ...s, new_password: v }))} secure />
            <Field label={t('Confirmation')} value={security.new_password_confirmation} onChangeText={(v) => setSecurity((s) => ({ ...s, new_password_confirmation: v }))} secure />
            <SaveBtn loading={saveSecurity.isPending} onPress={() => saveSecurity.mutate()} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, multiline, secure }: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address'; multiline?: boolean; secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldMultiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secure}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

function SaveBtn({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.saveBtn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveTxt}>{t('Enregistrer')}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  tabOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTxtOn: { color: '#FFF' },
  form: { padding: 16, paddingBottom: 48, gap: 12 },
  field: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  fieldInput: { fontSize: 15, color: '#111827', paddingVertical: 4 },
  fieldMultiline: { minHeight: 80, textAlignVertical: 'top' },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 4 },
  chipHint: { fontSize: 13, color: '#9CA3AF' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  locChipTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  locChipTxtOn: { color: '#FFF' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 10, padding: 10, marginBottom: 6 },
  hourDay: { width: 72, fontSize: 12, fontWeight: '600', color: '#374151' },
  hourInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 6, fontSize: 13 },
  hourSep: { color: '#9CA3AF' },
  docTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  docChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  docChipTxt: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },
  docChipTxtOn: { color: '#FFF', fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14 },
  uploadTxt: { color: '#FFF', fontWeight: '700' },
  docRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginTop: 8 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  docSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
