import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { supportService } from '@/services/support.service';
import { ticketStatusColor, ticketStatusLabel } from '@/utils/supportLabels';
import { useAuthStore } from '@/store/authStore';
import { t, chevronChar, jsLocale } from '@/i18n';

/** Les tickets d'assistance d'un client ou d'une agence (même suivi que sur le site). */
export default function SupportTicketsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => supportService.list(),
    enabled: isAuthenticated,
  });

  const tickets = data?.data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <PageHeader
        title={t('Assistance')}
        right={
          isAuthenticated ? (
            <TouchableOpacity onPress={() => router.push('/assistance/new')} style={styles.addBtn} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {!isAuthenticated ? (
        <Text style={styles.empty}>{t('Connectez-vous pour contacter l\'assistance.')}</Text>
      ) : isError ? (
        <TouchableOpacity style={styles.errorBox} onPress={() => refetch()} activeOpacity={0.85}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B45309" />
          <Text style={styles.errorTitle}>{t('Chargement impossible')}</Text>
          <Text style={styles.errorSub}>{t('Appuyez pour réessayer')}</Text>
        </TouchableOpacity>
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/assistance/${item.id}`)} activeOpacity={0.8}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                <Text style={styles.meta}>
                  {item.ticket_number ? `${item.ticket_number} · ` : ''}
                  {item.created_at ? new Date(item.created_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${ticketStatusColor(item.status)}1A` }]}>
                <Text style={[styles.badgeText, { color: ticketStatusColor(item.status) }]}>{ticketStatusLabel(item.status)}</Text>
              </View>
              <Text style={styles.arrow}>{chevronChar()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t('Aucun ticket pour le moment')}</Text>
              <Text style={styles.emptyText}>{t('Un souci avec une réservation, un paiement ou votre compte ? Écrivez-nous.')}</Text>
              <TouchableOpacity style={styles.cta} onPress={() => router.push('/assistance/new')} activeOpacity={0.85}>
                <Text style={styles.ctaText}>{t('Ouvrir un ticket')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  subject: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#9CA3AF' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  arrow: { fontSize: 22, color: '#C7C7CC', fontWeight: '300' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, paddingHorizontal: 24 },
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
  cta: { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  ctaText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  errorBox: { margin: 24, padding: 24, backgroundColor: '#FFFBEB', borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FDE68A' },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  errorSub: { fontSize: 12, color: '#B45309' },
});
