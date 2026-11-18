import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminMessagesInbox from '@/components/AdminMessagesInbox';
import { ADMIN_BG } from '@/constants/adminTheme';

import { t } from '@/i18n';

/** Onglet Messages agence — même présentation que l’admin. */
export default function AgenceMessagesScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminMessagesInbox
        queryCacheKey="agence"
        heroIcon="chatbubbles"
        heroTitle="Messages clients"
        heroSubtitle="Conversations avec vos clients"
        showPeerFilters={false}
        emptySubtitle={t('Vos échanges avec les clients apparaîtront ici.')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
});
