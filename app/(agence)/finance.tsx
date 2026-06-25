import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { financeService } from '@/services/finance.service';

export default function AgenceFinanceScreen() {
  const router = useRouter();
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
      Alert.alert('Demande envoyée', 'Votre demande de virement a été transmise.');
      setAmount('');
      setBankName('');
      setRib('');
      setHolder('');
      setNotes('');
    },
    onError: () => Alert.alert('Erreur', 'Vérifiez le montant et les coordonnées bancaires.'),
  });

  const submit = () => {
    if (!Number(amount) || !bankName.trim() || !rib.trim() || !holder.trim()) {
      Alert.alert('Champs requis', 'Montant, banque, RIB et titulaire sont obligatoires.');
      return;
    }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Paiements</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Demandez un virement de vos revenus vers votre compte bancaire.
        </Text>

        <Field label="Montant (DH)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Field label="Nom de la banque" value={bankName} onChangeText={setBankName} />
        <Field label="RIB / compte bancaire" value={rib} onChangeText={setRib} />
        <Field label="Titulaire du compte" value={holder} onChangeText={setHolder} />
        <Field label="Note (optionnel)" value={notes} onChangeText={setNotes} multiline />

        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveTxt}>Envoyer la demande</Text>
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
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },
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
