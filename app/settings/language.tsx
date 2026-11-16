import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '@/components/PageHeader';
import { chooseLanguage } from '@/components/LanguageSwitcher';
import { COLORS } from '@/constants/api';
import { LOCALES, t, useLocale } from '@/i18n';
import { useAuthStore } from '@/store/authStore';

export default function LanguageScreen() {
  const locale = useLocale();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title={t('Langue')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('Choisissez la langue de l\'application. Elle s\'applique aussi à vos e-mails et notifications.')}</Text>

        <View style={styles.card}>
          {LOCALES.map((item, index) => {
            const active = item.code === locale;

            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.row, index < LOCALES.length - 1 && styles.rowBorder]}
                onPress={() => void chooseLanguage(item.code, isAuthenticated)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.rtl ? <Text style={styles.sub}>{t('Lecture de droite à gauche')}</Text> : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : <Ionicons name="ellipse-outline" size={22} color={COLORS.border} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, gap: 16 },
  intro: { fontSize: 13, color: COLORS.gray, lineHeight: 19 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  sub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
});
