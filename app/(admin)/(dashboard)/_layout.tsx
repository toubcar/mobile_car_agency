import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { messagesService } from '@/services/messages.service';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? COLORS.primary : '#9CA3AF'} />
    </View>
  );
}

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
          title: 'Tableau de bord',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cars"
        options={{
          title: 'Véhicules',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'car' : 'car-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Réservations',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: messageBadge,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Utilisateurs',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} />,
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
  label:          { fontSize: 10, fontWeight: '500', marginTop: -2 },
  iconWrap:       { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  iconWrapActive: { backgroundColor: '#EBF5FB' },
});
