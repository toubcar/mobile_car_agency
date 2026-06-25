import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/api';
import { useRequireRole } from '@/hooks/useRequireRole';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? COLORS.primary : '#9CA3AF'} />
    </View>
  );
}

export default function AgenceLayout() {
  useRequireRole('agence');
  const insets = useSafeAreaInsets();

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
          title: 'Mes véhicules',
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
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mon agence',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'business' : 'business-outline'} focused={focused} />,
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
  iconWrap: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  iconWrapActive: { backgroundColor: '#EBF5FB' },
});
