import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { useRequireRole } from '@/hooks/useRequireRole';
import { messagesService } from '@/services/messages.service';
import BackofficeTabIcon from '@/components/backoffice/BackofficeTabIcon';
import AgencyStatusScreen from '@/components/agence/AgencyStatusScreen';
import { useAuthStore } from '@/store/authStore';

import { t } from '@/i18n';

export default function AgenceLayout() {
  useRequireRole('agence');
  const insets = useSafeAreaInsets();
  const agencyApproved = useAuthStore((state) => !state.user?.agency || state.user.agency.status === 'approved');
  const { data: conversations } = useQuery({
    queryKey: ['message-conversations', 'agence'],
    queryFn: () => messagesService.conversations(),
    refetchInterval: 30_000,
    enabled: agencyApproved,
  });
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
  const messageBadge = unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : String(unreadMessages)) : undefined;

  // Not approved yet, rejected or suspended: the website sends such an agency to its own page, not to the back-office
  const agency = useAuthStore((state) => state.user?.agency);
  if (agency && agency.status !== 'approved') {
    return <AgencyStatusScreen agency={agency} />;
  }

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
          title: t('Tableau de bord'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/cars"
        options={{
          title: t('Mes véhicules'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'car' : 'car-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/bookings"
        options={{
          title: t('Réservations'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/messages"
        options={{
          title: t('Messages'),
          tabBarBadge: messageBadge,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/profile"
        options={{
          title: t('Mon agence'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen name="agency-profile" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="cancellations" options={{ href: null }} />
      <Tabs.Screen name="finance" options={{ href: null }} />
      <Tabs.Screen name="bank-account" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="commissions" options={{ href: null }} />
      <Tabs.Screen name="maintenance" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="external-sites" options={{ href: null }} />
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
