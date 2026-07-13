import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
};

/** Icône d’onglet back-office (admin + agence). */
export default function BackofficeTabIcon({ name, focused }: Props) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? COLORS.primary : '#9CA3AF'} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconWrapActive: { backgroundColor: '#EBF5FB' },
});
