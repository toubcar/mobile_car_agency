import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { carsService } from '@/services/cars.service';
import { useAuthStore } from '@/store/authStore';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { jsLocale, t } from '@/i18n';

function Stars({ value, size = 14, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} disabled={!onPick} onPress={() => onPick?.(n)} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}>
          <Ionicons name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Ce que les clients disent du véhicule (avis publiés) et le moyen d'en laisser un après une location. */
export default function CarReviews({ carId }: { carId: number }) {
  const queryClient = useQueryClient();
  const { openAuthSheet } = useAuthSheet();
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['car', String(carId), 'reviews'],
    queryFn: () => carsService.getReviews(carId),
  });

  const send = useMutation({
    mutationFn: () => carsService.postReview(carId, rating, comment.trim()),
    onSuccess: (result) => {
      setOpen(false);
      setComment('');
      Alert.alert(t('Merci !'), result.message);
      void queryClient.invalidateQueries({ queryKey: ['car', String(carId)] });
    },
    onError: (err) => {
      const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      Alert.alert(t('Avis impossible'), message ?? t('Réessayez dans un instant.'));
    },
  });

  const summary = data?.summary;
  const canWrite = role === 'client' || !isAuthenticated;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('Avis des clients')}</Text>
        {summary && summary.count > 0 ? (
          <View style={styles.summary}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.summaryText}>{summary.average.toFixed(1)} · {t(':count avis', { count: summary.count })}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator color="#1D3557" style={{ marginVertical: 12 }} /> : null}

      {!isLoading && !data?.data.length ? <Text style={styles.empty}>{t('Aucun avis pour le moment.')}</Text> : null}

      {(data?.data ?? []).map((review) => (
        <View key={review.id} style={styles.review}>
          <View style={styles.reviewHead}>
            <Text style={styles.author}>{review.author}</Text>
            <Stars value={review.rating} size={12} />
          </View>
          {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
          {review.created_at ? <Text style={styles.date}>{new Date(review.created_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</Text> : null}
        </View>
      ))}

      {canWrite ? (
        <TouchableOpacity style={styles.writeBtn} onPress={() => (isAuthenticated ? setOpen(true) : openAuthSheet('login'))} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={16} color="#1D3557" />
          <Text style={styles.writeText}>{t('Donner mon avis')}</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('Votre avis sur ce véhicule')}</Text>
            <Stars value={rating} size={32} onPick={setRating} />
            <TextInput
              style={styles.input}
              multiline
              maxLength={1000}
              placeholder={t('Racontez votre location (facultatif)')}
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
            />
            <Text style={styles.note}>{t('Votre avis sera publié après vérification.')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{t('Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submit, send.isPending && { opacity: 0.6 }]} onPress={() => send.mutate()} disabled={send.isPending} activeOpacity={0.85}>
                {send.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{t('Envoyer')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  empty: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  review: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12, marginBottom: 8, gap: 6 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  author: { fontSize: 13, fontWeight: '700', color: '#111827' },
  comment: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  date: { fontSize: 11, color: '#9CA3AF' },
  writeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#1D3557', marginTop: 4 },
  writeText: { fontSize: 14, fontWeight: '800', color: '#1D3557' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  input: { minHeight: 90, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 12, fontSize: 14, color: '#111827', textAlignVertical: 'top' },
  note: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB' },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  submit: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#1D3557' },
  submitText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
