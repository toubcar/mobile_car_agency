import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { useRequireRole } from '@/hooks/useRequireRole';
import { messagesService } from '@/services/messages.service';
import BackofficeTabIcon from '@/components/backoffice/BackofficeTabIcon';

export default function AgenceLayout() {
  useRequireRole('agence');
  const insets = useSafeAreaInsets();
  const { data: conversations } = useQuery({
    queryKey: ['message-conversations', 'agence'],
    queryFn: () => messagesService.conversations(),
    refetchInterval: 30_000,
  });
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const messageBadge = unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : String(unreadMessages)) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { height: 58 + insets.bottom, paddingBottom: insets.bottom }],
      }}
    >
      <Tabs.Screen
        name="(dashboard)/index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/cars"
        options={{
          title: 'Mes véhicules',
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'car' : 'car-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/bookings"
        options={{
          title: 'Réservations',
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/messages"
        options={{
          title: 'Messages',
          tabBarBadge: messageBadge,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/profile"
        options={{
          title: 'Mon agence',
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen name="agency-profile" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="cancellations" options={{ href: null }} />
      <Tabs.Screen name="finance" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  label: { fontSize: 10, fontWeight: '500', marginTop: -2 },
});
