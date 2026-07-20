import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

const SECTIONS = [
  {
    title: 'Compte',
    items: [
      { label: 'Informations personnelles', sub: 'Nom et téléphone', route: '/settings/personal-info' },
      { label: 'Connexion et sécurité', sub: 'Mot de passe, comptes liés', route: '/settings/login-security' },
    ],
  },
  {
    title: 'Préférences',
    items: [
      { label: 'Notifications', sub: 'Push, e-mail et SMS', route: '/settings/notifications' },
    ],
  },
  {
    title: 'Paiements',
    items: [
      { label: 'Paiements et historique', sub: 'Moyens de paiement, coupons', route: '/payments' },
    ],
  },
];

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { isCompact, scrollContentStyle, headerGradientHeight } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#C8E6F5', COLORS.background]}
        style={[styles.headerGradient, { height: headerGradientHeight }]}
      />
      <PageHeader title="Paramètres du compte" />

      <ScrollView
        contentContainerStyle={[styles.scroll, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.row, isCompact && styles.rowCompact, i < section.items.length - 1 && styles.rowBorder]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowLabel, isCompact && styles.rowLabelCompact]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {item.sub ? (
                      <Text style={styles.rowSub} numberOfLines={2}>
                        {item.sub}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: { paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCompact: { paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLeft: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 15, color: COLORS.black, fontWeight: '700' },
  rowLabelCompact: { fontSize: 14 },
  rowSub: { fontSize: 12, color: COLORS.gray, marginTop: 3, fontWeight: '500' },
  chevron: { fontSize: 22, color: COLORS.gray, fontWeight: '300', lineHeight: 22 },
});
