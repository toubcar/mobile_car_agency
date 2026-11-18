import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { supportService, type SupportTicket, type TicketCategory } from '@/services/support.service';
import { useAuthStore } from '@/store/authStore';
import { t } from '@/i18n';

// A customer picks from four subjects, an agency from six (the website's lists)
const CATEGORIES: { key: TicketCategory; label: () => string; agencyOnly?: boolean }[] = [
  { key: 'technical', label: () => t('Problème technique') },
  { key: 'billing', label: () => t('Facturation et paiement') },
  { key: 'booking', label: () => t('Réservation'), agencyOnly: true },
  { key: 'general', label: () => t('Question générale') },
  { key: 'complaint', label: () => t('Réclamation') },
  { key: 'account', label: () => t('Mon compte'), agencyOnly: true },
];

const PRIORITIES: { key: SupportTicket['priority']; label: () => string }[] = [
  { key: 'low', label: () => t('Basse') },
  { key: 'medium', label: () => t('Moyenne') },
  { key: 'high', label: () => t('Haute') },
  { key: 'urgent', label: () => t('Urgente') },
];

export default function NewTicketScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isAgency = role === 'agence';

  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const create = useMutation({
    mutationFn: () => supportService.create({ category, priority, subject: subject.trim(), message: message.trim() }),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['support'] });
      router.replace(`/assistance/${ticket.id}`);
    },
    onError: (err) => {
      const body = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined) : undefined;
      Alert.alert(t('Envoi impossible.'), body?.message ?? t('Vérifiez les champs et réessayez.'));
    },
  });

  const submit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t('Champs requis'), t('Veuillez remplir tous les champs.'));
      return;
    }
    create.mutate();
  };

  const categories = CATEGORIES.filter((c) => isAgency || !c.agencyOnly);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title={t('Nouveau ticket')} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('Sujet')}</Text>
          <View style={styles.chips}>
            {categories.map((c) => (
              <TouchableOpacity key={c.key} style={[styles.chip, category === c.key && styles.chipOn]} onPress={() => setCategory(c.key)} activeOpacity={0.8}>
                <Text style={[styles.chipText, category === c.key && styles.chipTextOn]}>{c.label()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('Priorité')}</Text>
          <View style={styles.chips}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity key={p.key} style={[styles.chip, priority === p.key && styles.chipOn]} onPress={() => setPriority(p.key)} activeOpacity={0.8}>
                <Text style={[styles.chipText, priority === p.key && styles.chipTextOn]}>{p.label()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('Titre')}</Text>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} maxLength={255} placeholder={t('En quelques mots')} placeholderTextColor="#9CA3AF" />

          <Text style={styles.label}>{t('Message')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={message}
            onChangeText={setMessage}
            maxLength={2000}
            multiline
            placeholder={t('Décrivez votre demande')}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={[styles.submit, create.isPending && { opacity: 0.6 }]} onPress={submit} disabled={create.isPending} activeOpacity={0.85}>
            {create.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{t('Envoyer')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextOn: { color: '#FFF' },
  input: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  textarea: { minHeight: 140, textAlignVertical: 'top' },
  submit: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
