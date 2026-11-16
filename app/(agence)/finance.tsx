import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService } from '@/services/finance.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';

import { t } from '@/i18n';

export default function AgenceFinanceScreen() {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [rib, setRib] = useState('');
  const [holder, setHolder] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      financeService.requestPayment({
        amount: Number(amount),
        bank_name: bankName.trim(),
        rib_number: rib.trim(),
        account_holder: holder.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert(t('Demande envoyée'), t('Votre demande de virement a été transmise.'));
      setAmount('');
      setBankName('');
      setRib('');
      setHolder('');
      setNotes('');
    },
    onError: () => Alert.alert(t('Erreur'), t('Vérifiez le montant et les coordonnées bancaires.')),
  });

  const submit = () => {
    if (!Number(amount) || !bankName.trim() || !rib.trim() || !holder.trim()) {
      Alert.alert(t('Champs requis'), t('Montant, banque, RIB et titulaire sont obligatoires.'));
      return;
    }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Paiements')} subtitle={t('Demande de virement')} />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          {t('Demandez un virement de vos revenus vers votre compte bancaire.')}
        </Text>

        <Field label={t('Montant (DH)')} value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Field label={t('Nom de la banque')} value={bankName} onChangeText={setBankName} />
        <Field label={t('RIB / compte bancaire')} value={rib} onChangeText={setRib} />
        <Field label={t('Titulaire du compte')} value={holder} onChangeText={setHolder} />
        <Field label={t('Note (optionnel)')} value={notes} onChangeText={setNotes} multiline />

        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveTxt}>{t('Envoyer la demande')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, multiline }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  form: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textarea: { minHeight: 80, paddingTop: 12 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveTxt: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
