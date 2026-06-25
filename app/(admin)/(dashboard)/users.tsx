import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { usersService } from '@/services/users.service';
import type { User } from '@/types';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

export default function AdminUsersScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', search],
    queryFn:  () => usersService.getAll(1, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError:    () => Alert.alert('Erreur', 'Impossible de supprimer cet utilisateur.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => usersService.toggleVerification(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const confirmDelete = (user: User) =>
    Alert.alert('Supprimer', `Supprimer "${user.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(user.id) },
    ]);

  const users = data?.data ?? [];
  const userStats = data?.statistics;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="people-outline" size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>Sécurité admin</Text>
          <Text style={styles.heroTitle}>Utilisateurs</Text>
          <Text style={styles.heroSub}>{data?.total ?? 0} compte{(data?.total ?? 0) !== 1 ? 's' : ''} synchronisé{(data?.total ?? 0) !== 1 ? 's' : ''} avec Laravel</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou email…"
            placeholderTextColor="#C7C7CC"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#9CA3AF" /></TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{userStats?.admins ?? 0}</Text><Text style={styles.statLabel}>Admins</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#065F46' }]}>{userStats?.verified ?? 0}</Text><Text style={styles.statLabel}>Vérifiés</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, { color: '#92400E' }]}>{userStats?.unverified ?? 0}</Text><Text style={styles.statLabel}>À vérifier</Text></View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => {
            const initials = item.name.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('');
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/user/${item.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{initials}</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{item.name}</Text>
                    {item.is_verified && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
                  </View>
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                  <Text style={styles.roleText}>{item.role}</Text>
                </View>
                {!item.is_verified ? (
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={(e) => { e.stopPropagation?.(); verifyMutation.mutate(item.id); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => { e.stopPropagation?.(); confirmDelete(item); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={17} color="#FF3B30" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={15} color="#C7C7CC" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucun utilisateur</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F2F2F7' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginHorizontal: 16, marginTop: 14, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', marginTop: 3 },
  heroSub: { fontSize: 12, color: '#D6EAF8', marginTop: 4, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, ...SHADOW },
  statVal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginTop: 3 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:       { paddingHorizontal: 16, paddingBottom: 100 },
  card:       { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EEF2F7', ...SHADOW },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  userInfo:   { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  userName:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  userEmail:  { fontSize: 12, color: '#8E8E93' },
  roleText: { alignSelf: 'flex-start', marginTop: 6, fontSize: 10, fontWeight: '800', color: COLORS.primary, backgroundColor: '#EBF5FB', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, textTransform: 'uppercase' },
  verifyBtn:  { padding: 2 },
  deleteBtn:  { padding: 2 },
  empty:      { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
