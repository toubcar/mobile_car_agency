import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminMessagesInbox from '@/components/AdminMessagesInbox';

export default function AdminMessagesTab() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminMessagesInbox />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
});
