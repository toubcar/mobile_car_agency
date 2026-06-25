import { SafeAreaView } from 'react-native-safe-area-context';
import MessagesInbox from '@/components/MessagesInbox';

/** Onglet Messages — conversations clients (API /messages). */
export default function AgenceMessagesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }} edges={['top']}>
      <MessagesInbox />
    </SafeAreaView>
  );
}
