import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface PageHeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function PageHeader({ title, onBack, showBack = true, right }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={18} color="#111827" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={styles.rightSlot}>
        {right ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placeholder: {
    width: 38,
    height: 38,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 8,
  },
  rightSlot: {
    width: 38,
    height: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
