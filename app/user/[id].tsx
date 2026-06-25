import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { usersService } from '@/services/users.service';
import type { User } from '@/types';

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 };

export default function UserDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user', id],
    queryFn:  () => usersService.getById(Number(id)),
  });

  const toggleMutation = useMutation({
    mutationFn: () => usersService.toggleVerification(Number(id)),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
    onError:    () => Alert.alert('Erreur', 'Modification impossible.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersService.delete(Number(id)),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); router.back(); },
    onError:    () => Alert.alert('Erreur', 'Suppression impossible.'),
  });

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  const initials = user.name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil utilisateur</Text>
        <TouchableOpacity
          style={styles.deleteHeaderBtn}
          onPress={() => Alert.alert('Supprimer', `Supprimer "${user.name}" ?`, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate() }])}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroKicker}>Profil utilisateur</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
          <View style={[styles.verifyBadge, { backgroundColor: user.is_verified ? '#D1FAE5' : '#FEF3C7' }]}>
            <Ionicons name={user.is_verified ? 'checkmark-circle' : 'time'} size={13} color={user.is_verified ? '#065F46' : '#92400E'} />
            <Text style={[styles.verifyTxt, { color: user.is_verified ? '#065F46' : '#92400E' }]}>
              {user.is_verified ? 'Vérifié' : 'À vérifier'}
            </Text>
          </View>
        </View>

        {/* Info */}
        <Text style={styles.section}>Coordonnées</Text>
        <View style={styles.card}>
          {[
            { icon: 'mail-outline'     as const, label: 'Email',          value: user.email },
            ...(user.phone ? [{ icon: 'call-outline' as const, label: 'Téléphone', value: user.phone }] : []),
            { icon: 'calendar-outline' as const, label: 'Membre depuis',  value: new Date(user.created_at ?? Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
          ].map((r, i, arr) => (
            <View key={r.label}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}><Ionicons name={r.icon} size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue}>{r.value}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.section}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert(
              user.is_verified ? 'Retirer la vérification' : 'Vérifier',
              `Modifier le statut de vérification de "${user.name}" ?`,
              [{ text: 'Annuler', style: 'cancel' }, { text: 'Confirmer', onPress: () => toggleMutation.mutate() }]
            )}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={user.is_verified ? 'shield-outline' : 'shield-checkmark-outline'} size={18} color={user.is_verified ? '#FF3B30' : '#10B981'} />
            </View>
            <Text style={[styles.actionLabel, { color: user.is_verified ? '#FF3B30' : '#10B981' }]}>
              {user.is_verified ? 'Retirer la vérification' : 'Vérifier le compte'}
            </Text>
            {toggleMutation.isPending
              ? <ActivityIndicator size="small" color="#8E8E93" />
              : <Ionicons name="chevron-forward" size={15} color="#C7C7CC" />
            }
          </TouchableOpacity>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => Alert.alert('Supprimer', `Supprimer définitivement "${user.name}" ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate() },
          ])}
          activeOpacity={0.85}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending
            ? <ActivityIndicator color="#FF3B30" />
            : <Text style={styles.deleteBtnTxt}>Supprimer le compte</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F2F2F7' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitle:    { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  deleteHeaderBtn:{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  scroll:  { paddingHorizontal: 16, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: '600', color: '#6D6D72', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4 },

  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary, borderRadius: 22, padding: 16, marginTop: 8, marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 8 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 23, fontWeight: '800', color: '#FFF' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: '#AED6F1', letterSpacing: 0.9, textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 3 },
  roleText: { alignSelf: 'flex-start', marginTop: 6, fontSize: 10, fontWeight: '800', color: '#D6EAF8', textTransform: 'uppercase' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  verifyTxt:   { fontSize: 13, fontWeight: '700' },

  card:    { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F7', ...SHADOW },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0', marginLeft: 60 },

  infoRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 2, fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '600' },

  actionRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  actionIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },

  deleteBtn:    { marginTop: 24, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FF3B30', backgroundColor: '#FEF2F2' },
  deleteBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
});
