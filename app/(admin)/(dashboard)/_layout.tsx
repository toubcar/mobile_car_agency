import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { messagesService } from '@/services/messages.service';
import BackofficeTabIcon from '@/components/backoffice/BackofficeTabIcon';

import { t } from '@/i18n';

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const { data: conversations } = useQuery({
    queryKey: ['message-conversations', 'admin'],
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
        name="index"
        options={{
          title: t('Tableau de bord'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cars"
        options={{
          title: t('Véhicules'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'car' : 'car-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('Réservations'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('Messages'),
          tabBarBadge: messageBadge,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: t('Utilisateurs'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Profil'),
          tabBarIcon: ({ focused }) => <BackofficeTabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  label: { fontSize: 10, fontWeight: '500', marginTop: -2 },
});
