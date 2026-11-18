import { Stack } from 'expo-router';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function AdminLayout() {
  useRequireRole('admin');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(dashboard)" options={{ animation: 'none' }} />
      <Stack.Screen name="agencies" />
      <Stack.Screen name="support" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="ticket/[id]" />
      <Stack.Screen name="customer/[id]" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="system" />
      <Stack.Screen name="content" />
    </Stack>
  );
}
