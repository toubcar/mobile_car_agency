import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/PageHeader';
import MessagesInbox from '../../components/MessagesInbox';

import { t } from '@/i18n';

export default function MessagesScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title={t('Messages')} showBack={false} />
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>{t('Connectez-vous pour voir vos messages')}</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={() => router.push('/(auth)/onboarding')}>
            <Text style={styles.connectBtnText}>{t('Se connecter')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title={t('Messages')} showBack={false} />
      <MessagesInbox />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginTop: 8 },
  connectBtn: { backgroundColor: '#1D3557', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, marginTop: 8 },
  connectBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
