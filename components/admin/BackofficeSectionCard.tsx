import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';
import { adminShadow } from '@/constants/adminTheme';
import type { BackofficeSection } from '@/services/backoffice.service';
import { formatMoney, toAmount } from '@/utils/money';

function formatValue(section: BackofficeSection) {
  if (section.metric === 'money') return formatMoney(section.value);
  if (section.metric === 'completion') return `${section.value}%`;
  return toAmount(section.value).toLocaleString('fr-FR');
}

export default function BackofficeSectionCard({
  section,
  onPress,
}: {
  section: BackofficeSection;
  onPress?: () => void;
}) {
  const hasAttention = Number(section.attention || 0) > 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.76} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Ionicons name={section.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={COLORS.primary} />
        </View>
        <View style={[styles.statusDot, hasAttention ? styles.statusWarn : styles.statusOk]} />
      </View>
      <Text style={styles.value}>{formatValue(section)}</Text>
      <Text style={styles.title} numberOfLines={1}>{section.title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>{section.subtitle}</Text>
      {hasAttention ? (
        <View style={styles.attention}>
          <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
          <Text style={styles.attentionText}>{section.attention} à traiter</Text>
        </View>
      ) : (
        <View style={styles.attention}>
          <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
          <Text style={[styles.attentionText, styles.okText]}>Stable</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...adminShadow.card,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusWarn: { backgroundColor: '#F59E0B' },
  statusOk: { backgroundColor: '#10B981' },
  value: { fontSize: 21, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  title: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtitle: { fontSize: 11, color: '#8E8E93', lineHeight: 15, marginTop: 3, minHeight: 30 },
  attention: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  attentionText: { fontSize: 11, color: '#B45309', fontWeight: '700' },
  okText: { color: '#059669' },
});
