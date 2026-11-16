import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { carsService } from '@/services/cars.service';
import { useAuthStore } from '@/store/authStore';
import type { Car } from '@/types';

import { t } from '@/i18n';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };
const FUELS = ['Essence', 'Diesel', 'Électrique', 'Hybride'];

function Field({ label, value, onChangeText, placeholder, keyboardType, sep }: {
  label: string; value?: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric' | 'email-address'; sep?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, sep && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor="#C7C7CC"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export default function CarFormScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const role         = useAuthStore((s) => s.role);
  const scope        = role === 'agence' ? 'agence' : 'admin';
  const isBackoffice = role === 'admin' || role === 'agence';
  const isNew        = id === 'new';
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState<Partial<Car>>({
    brand: '', model: '', registration_number: '', year: new Date().getFullYear(),
    price_per_day: 0, seats: 5,
    transmission: 'manual', fuel_type: 'Essence',
    is_available: true, description: '',
  });

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', id, scope],
    queryFn:  () =>
      isBackoffice
        ? carsService.getScoped(Number(id), scope)
        : carsService.getCar(Number(id)),
    enabled:  !isNew,
  });

  useEffect(() => { if (car) setForm(car); }, [car]);

  const set = (key: keyof Car, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const validateForm = () => {
    if (!form.brand?.trim()) return t('La marque est obligatoire.');
    if (!form.model?.trim()) return t('Le modèle est obligatoire.');
    if (!form.registration_number?.trim()) return t('L’immatriculation est obligatoire.');
    if (!form.year || form.year < 1980) return t('L’année du véhicule est invalide.');
    if (!form.price_per_day || form.price_per_day <= 0) return t('Le prix par jour doit être supérieur à 0.');
    return '';
  };

  const mutation = useMutation({
    mutationFn: () =>
      isNew ? carsService.create(form, scope) : carsService.update(Number(id), form, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      queryClient.invalidateQueries({ queryKey: ['agence-cars'] });
      Alert.alert(t('Succès'), isNew ? t('Véhicule ajouté.') : t('Véhicule mis à jour.'));
      router.back();
    },
    onError: (err: any) => Alert.alert(t('Erreur'), err?.response?.data?.message ?? t('Une erreur est survenue.')),
  });

  const submit = () => {
    const error = validateForm();
    setFormError(error);
    if (error) return;
    mutation.mutate();
  };

  if (!isNew && isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? t('Nouveau véhicule') : t('Modifier le véhicule')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="car-sport-outline" size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>{role === 'agence' ? t('Flotte agence') : t('Catalogue admin')}</Text>
              <Text style={styles.heroTitle}>{form.brand || form.model ? `${form.brand ?? ''} ${form.model ?? ''}`.trim() : t('Nouveau véhicule')}</Text>
              <Text style={styles.heroSub}>
                {form.registration_number?.trim() ? form.registration_number : t('Immatriculation requise')} · {form.is_available ? t('Disponible') : t('Masqué')}
              </Text>
            </View>
          </View>

          {formError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Informations */}
          <Text style={styles.section}>{t('Informations')}</Text>
          <View style={styles.card}>
            <Field label={t('Marque')}       value={form.brand}    onChangeText={(v) => set('brand', v)}    placeholder={t('Ex: Renault')} sep />
            <Field label={t('Modèle')}       value={form.model}    onChangeText={(v) => set('model', v)}    placeholder={t('Ex: Clio')}    sep />
            <Field label={t('Immatriculation')} value={form.registration_number} onChangeText={(v) => set('registration_number', v)} placeholder={t('Ex: 12345-A-16')} sep />
            <Field label={t('Année')} value={String(form.year ?? '')} onChangeText={(v) => set('year', parseInt(v) || 0)} placeholder="2023" keyboardType="numeric" />
          </View>

          {/* Specs */}
          <Text style={styles.section}>{t('Caractéristiques')}</Text>
          <View style={styles.card}>
            <Field label={t('Places')} value={String(form.seats ?? '')} onChangeText={(v) => set('seats', parseInt(v) || 0)} placeholder="5" keyboardType="numeric" sep />
            <View style={[styles.rowField, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('Transmission')}</Text>
              <View style={styles.toggleRow}>
                {(['manual', 'automatic'] as const).map((mode) => (
                  <TouchableOpacity key={mode} style={[styles.toggleBtn, form.transmission === mode && styles.toggleBtnActive]} onPress={() => set('transmission', mode)} activeOpacity={0.7}>
                    <Text style={[styles.toggleTxt, form.transmission === mode && styles.toggleTxtActive]}>{mode === 'manual' ? t('Manuelle') : t('Auto')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>{t('Carburant')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {FUELS.map((f) => (
                  <TouchableOpacity key={f} style={[styles.chip, form.fuel_type === f && styles.chipActive]} onPress={() => set('fuel_type', f)} activeOpacity={0.7}>
                    <Text style={[styles.chipTxt, form.fuel_type === f && styles.chipTxtActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Price */}
          <Text style={styles.section}>{t('Tarif')}</Text>
          <View style={styles.card}>
            <Field label={t('Prix / jour (DH)')} value={String(form.price_per_day ?? '')} onChangeText={(v) => set('price_per_day', parseFloat(v) || 0)} placeholder="5000" keyboardType="numeric" />
          </View>

          {/* Description */}
          <Text style={styles.section}>{t('Description')}</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textarea}
              placeholder={t('Description du véhicule…')}
              placeholderTextColor="#C7C7CC"
              value={form.description ?? ''}
              onChangeText={(v) => set('description', v)}
              multiline numberOfLines={4} textAlignVertical="top"
            />
          </View>

          {/* Availability */}
          <Text style={styles.section}>{t('Disponibilité')}</Text>
          <View style={[styles.card, styles.availabilityCard]}>
            <View style={[styles.rowField, { paddingVertical: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.availabilityTitle}>{t('Disponible à la location')}</Text>
                <Text style={styles.availabilitySub}>{form.is_available ? t('Visible aux clients et prêt à réserver') : t('Masqué aux clients, gardé côté back-office')}</Text>
              </View>
              <Switch value={form.is_available ?? true} onValueChange={(v) => set('is_available', v)} trackColor={{ false: '#E5E5EA', true: COLORS.primary }} thumbColor="#FFF" />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
            onPress={submit}
            activeOpacity={0.85}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.saveBtnTxt}>{isNew ? t('Ajouter le véhicule') : t('Enregistrer les modifications')}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F2F2F7' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  scroll:  { paddingHorizontal: 16, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: '600', color: '#6D6D72', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4 },

  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginTop: 6, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#FFF', marginTop: 3 },
  heroSub: { fontSize: 12, color: '#D6EAF8', marginTop: 4, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 },
  errorText: { flex: 1, color: '#991B1B', fontSize: 12, fontWeight: '700' },

  card:        { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', ...SHADOW },
  fieldRow:    { paddingHorizontal: 16, paddingVertical: 12 },
  fieldBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  fieldLabel:  { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  fieldSubLabel: { fontSize: 11, color: '#C7C7CC', marginTop: 2 },
  fieldInput:  { fontSize: 15, color: '#111827', padding: 0 },

  rowField:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  toggleRow:  { flexDirection: 'row', gap: 6 },
  toggleBtn:  { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleTxt:  { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleTxtActive: { color: '#FFF' },

  chip:      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', ...SHADOW },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTxtActive: { color: '#FFF' },

  textarea: { padding: 14, fontSize: 15, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  availabilityCard: { borderWidth: 1, borderColor: '#D6EAF8' },
  availabilityTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  availabilitySub: { fontSize: 12, color: '#8E8E93', marginTop: 3, lineHeight: 17 },

  saveBtn:    { marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  saveBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
