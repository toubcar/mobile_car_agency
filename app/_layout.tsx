import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useEnforcePublicStartup } from '../hooks/useEnforcePublicStartup';
import { AuthSheetProvider } from '@/contexts/AuthSheetContext';

/** Toujours repasser par le splash au cold start (évite restauration sur login admin). */
export const unstable_settings = {
  initialRouteName: 'index',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const loadUser = useAuthStore((state) => state.loadUser);
  useEnforcePublicStartup();

  useEffect(() => {
    void loadUser().catch(() => {
      /* erreurs réseau gérées dans loadUser / clearSession */
    });
  }, [loadUser]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSheetProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(agence)" />
        <Stack.Screen
          name="car/[id]"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="booking/[id]" />
        <Stack.Screen name="booking/create" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="car-form/[id]" />
        <Stack.Screen name="messages/[rentalId]" options={{ headerShown: false }} />
        <Stack.Screen name="agency/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="messages/support/[ticketId]" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </Stack>
        </AuthSheetProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
