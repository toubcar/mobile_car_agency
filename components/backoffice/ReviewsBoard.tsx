import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { reviewsService, type ReviewFilters } from '@/services/reviews.service';
import type { BackofficeReview } from '@/types';
import { serverMessage } from '@/utils/apiError';
import { Badge, Button, Card, Chips, Empty, Field, Loading, Sheet, Stat, StatRow } from './ui';

import { t, jsLocale } from '@/i18n';

type Mode = 'agency' | 'admin';
type Filter = 'all' | 'no_reply' | 'replied' | 'published' | 'hidden' | 'low';

function Stars({ value }: { value: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
      ))}
    </View>
  );
}

function filtersFor(filter: Filter, search: string): ReviewFilters {
  const base: ReviewFilters = { per_page: 20, search: search.trim() || undefined };
  switch (filter) {
    case 'no_reply': return { ...base, replied: 'no' };
    case 'replied': return { ...base, replied: 'yes' };
    case 'published': return { ...base, visibility: 'published' };
    case 'hidden': return { ...base, visibility: 'hidden' };
    case 'low': return { ...base, rating: 1 };
    default: return base;
  }
}

/**
 * Les avis des clients, comme dans le back-office du site. L'agence lit ceux de ses locations et y répond (sa réponse
 * est publique) ; l'admin les lit tous, masque ceux qui ne respectent pas les règles, les affiche à nouveau ou les supprime.
 */
export default function ReviewsBoard({ mode }: { mode: Mode }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>(mode === 'agency' ? 'no_reply' : 'all');
  const [search, setSearch] = useState('');
  const [replying, setReplying] = useState<BackofficeReview | null>(null);
  const [replyText, setReplyText] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['backoffice-reviews', mode, filter, search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => reviewsService.list({ ...filtersFor(filter, search), page: pageParam }),
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['backoffice-reviews', mode] });
  const onError = (err: unknown) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));

  const reply = useMutation({
    mutationFn: () => reviewsService.reply(replying!.id, replyText.trim()),
    onSuccess: () => { setReplying(null); setReplyText(''); void refresh(); },
    onError,
  });
  const removeReply = useMutation({ mutationFn: (id: number) => reviewsService.removeReply(id), onSuccess: () => void refresh(), onError });
  const visibility = useMutation({
    mutationFn: (review: BackofficeReview) => (review.is_public ? reviewsService.hide(review.id) : reviewsService.publish(review.id)),
    onSuccess: () => void refresh(),
    onError,
  });
  const destroy = useMutation({ mutationFn: (id: number) => reviewsService.destroy(id), onSuccess: () => void refresh(), onError });

  const stats = query.data?.pages[0]?.statistics;
  const reviews = query.data?.pages.flatMap((page) => page.data) ?? [];

  const filterOptions: { value: Filter; label: string }[] = mode === 'agency'
    ? [
        { value: 'no_reply', label: t('Sans réponse') },
        { value: 'replied', label: t('Avec réponse') },
        { value: 'all', label: t('Tous') },
        { value: 'low', label: t('1 étoile') },
      ]
    : [
        { value: 'all', label: t('Tous') },
        { value: 'published', label: t('Publiés') },
        { value: 'hidden', label: t('Masqués') },
        { value: 'no_reply', label: t('Sans réponse de l\'agence') },
        { value: 'low', label: t('1 étoile') },
      ];

  const openReply = (review: BackofficeReview) => {
    setReplying(review);
    setReplyText(review.agency_reply ?? '');
  };

  const confirmRemoveReply = (review: BackofficeReview) =>
    Alert.alert(t('Supprimer la réponse'), t('Supprimer votre réponse à cet avis ?'), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => removeReply.mutate(review.id) },
    ]);

  const confirmDestroy = (review: BackofficeReview) =>
    Alert.alert(t('Supprimer'), t('Supprimer définitivement cet avis ?'), [
      { text: t('Annuler'), style: 'cancel' },
      { text: t('Supprimer'), style: 'destructive', onPress: () => destroy.mutate(review.id) },
    ]);

  const header = (
    <View style={styles.header}>
      {stats ? (
        <StatRow>
          <Stat label={t('Note moyenne')} value={stats.average_rating ? `${stats.average_rating.toFixed(1)} ★` : '—'} tone="#B45309" />
          <Stat label={t('Avis')} value={stats.total} />
          {mode === 'agency'
            ? <Stat label={t('Sans réponse')} value={stats.without_reply} tone={stats.without_reply ? '#B91C1C' : COLORS.primary} />
            : <Stat label={t('Masqués')} value={stats.hidden} tone="#6B7280" />}
        </StatRow>
      ) : null}
      <Text style={styles.intro}>
        {mode === 'agency'
          ? t('Votre réponse est publique : elle s\'affiche sous l\'avis, sur le site et dans l\'application.')
          : t('Chaque avis est écrit par un client après une vraie location et publié aussitôt. Masquez ceux qui ne respectent pas les règles (insultes, données personnelles, publicité).')}
      </Text>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={mode === 'agency' ? t('Client, véhicule, texte de l\'avis') : t('Client, agence, texte de l\'avis')}
        placeholderTextColor="#9CA3AF"
        returnKeyType="search"
      />
      <Chips value={filter} options={filterOptions} onChange={setFilter} />
    </View>
  );

  return (
    <>
      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={COLORS.primary} />}
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={query.isLoading ? <Loading /> : <Empty text={t('Aucun avis trouvé.')} icon="star-outline" />}
        ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Stars value={item.rating} />
              {!item.is_public ? <Badge label={t('Masqué')} color="#6B7280" bg="#F3F4F6" /> : null}
              {item.verified ? <Badge label={t('Location vérifiée')} color="#047857" bg="#ECFDF5" /> : null}
            </View>
            <Text style={styles.meta} numberOfLines={2}>
              {[item.customer ?? item.author, item.car, mode === 'admin' ? item.agency : null].filter(Boolean).join(' · ')}
            </Text>
            {item.created_at ? (
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            ) : null}
            {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}

            {item.agency_reply ? (
              <View style={styles.reply}>
                <Text style={styles.replyLabel}>{t('Réponse de l\'agence')}</Text>
                <Text style={styles.replyText}>{item.agency_reply}</Text>
              </View>
            ) : null}

            {mode === 'agency' ? (
              <View style={styles.actions}>
                <Button
                  label={item.agency_reply ? t('Modifier la réponse') : t('Répondre')}
                  icon="chatbubble-ellipses-outline"
                  variant={item.agency_reply ? 'secondary' : 'primary'}
                  onPress={() => openReply(item)}
                  style={styles.actionBtn}
                />
                {item.agency_reply ? (
                  <Button label={t('Supprimer la réponse')} variant="danger" onPress={() => confirmRemoveReply(item)} style={styles.actionBtn} />
                ) : null}
              </View>
            ) : (
              <View style={styles.actions}>
                <Button
                  label={item.is_public ? t('Masquer') : t('Afficher')}
                  icon={item.is_public ? 'eye-off-outline' : 'eye-outline'}
                  variant="secondary"
                  loading={visibility.isPending && visibility.variables?.id === item.id}
                  onPress={() => visibility.mutate(item)}
                  style={styles.actionBtn}
                />
                <Button label={t('Supprimer')} icon="trash-outline" variant="danger" onPress={() => confirmDestroy(item)} style={styles.actionBtn} />
              </View>
            )}
          </Card>
        )}
      />

      <Sheet
        visible={!!replying}
        title={replying?.agency_reply ? t('Modifier la réponse') : t('Répondre à l\'avis')}
        onClose={() => setReplying(null)}
        footer={(
          <>
            <Button label={t('Annuler')} variant="ghost" onPress={() => setReplying(null)} style={{ flex: 1 }} />
            <Button label={t('Publier')} onPress={() => reply.mutate()} loading={reply.isPending} disabled={replyText.trim().length < 2} style={{ flex: 2 }} />
          </>
        )}
      >
        {replying?.comment ? <Text style={styles.quoted} numberOfLines={4}>« {replying.comment} »</Text> : null}
        <Field
          label={t('Votre réponse')}
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={1000}
          hint={t('Votre réponse est publique : elle s\'affiche sous l\'avis, sur le site et dans l\'application.')}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  header: { gap: 12, marginBottom: 4 },
  intro: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  search: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  card: { gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stars: { flexDirection: 'row', gap: 1 },
  meta: { fontSize: 13, fontWeight: '700', color: '#111827' },
  date: { fontSize: 11, color: '#9CA3AF' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  comment: { fontSize: 14, color: '#374151', lineHeight: 20 },
  reply: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 10, gap: 4, marginTop: 4, borderStartWidth: 3, borderStartColor: COLORS.secondary },
  replyLabel: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  replyText: { fontSize: 13, color: '#1F2937', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: { flexGrow: 1 },
  quoted: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 12, lineHeight: 19 },
});
