import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { pricingService } from '@/services/pricing.service';
import { formatMoney } from '@/utils/money';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

export default function AgencePricingScreen() {
  const [carId, setCarId] = useState('');
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const [multiplier, setMultiplier] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      pricingService.updateCarPrice({
        car_id: Number(carId),
        price_per_day: Number(price),
        reason: reason.trim(),
        seasonal_multiplier: multiplier ? Number(multiplier) : undefined,
      }),
    onSuccess: (data) => {
      Alert.alert(
        'Prix mis à jour',
        `${data.brand} ${data.model} : ${formatMoney(data.old_price, { suffix: false })} → ${formatMoney(data.price_per_day)}/jour`,
      );
      setCarId('');
      setPrice('');
      setReason('');
      setMultiplier('');
    },
    onError: () => Alert.alert('Erreur', 'Vérifiez l’ID véhicule et les champs obligatoires.'),
  });

  const submit = () => {
    if (!Number(carId) || !Number(price) || !reason.trim()) {
      Alert.alert('Champs requis', 'ID véhicule, prix et raison sont obligatoires.');
      return;
    }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title="Tarification" subtitle="Prix journalier des véhicules" />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="ID du véhicule" value={carId} onChangeText={setCarId} keyboardType="numeric" />
        <Field label="Nouveau prix (DH/jour)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <Field label="Raison du changement" value={reason} onChangeText={setReason} multiline />
        <Field label="Multiplicateur saisonnier (optionnel)" value={multiplier} onChangeText={setMultiplier} keyboardType="numeric" />

        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveTxt}>Appliquer le nouveau prix</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric'; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  form: { padding: 16, paddingBottom: 48, gap: 12 },
  field: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  fieldInput: { fontSize: 15, color: '#111827' },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
