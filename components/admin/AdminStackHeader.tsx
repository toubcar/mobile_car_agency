import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminShadow, ADMIN_BG } from '@/constants/adminTheme';

type Props = {
  title: string;
  subtitle?: string;
};

export default function AdminStackHeader({ title, subtitle }: Props) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.75} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color="#111827" />
      </TouchableOpacity>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: ADMIN_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...adminShadow.nav,
  },
  titles: { flex: 1, marginHorizontal: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  right: { width: 40 },
});
