import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/api';
import { LOCALES, setLocale, useLocale, type Locale } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { profileService } from '@/services/profile.service';

/** Change la langue de l'app et, si on est connecté, celle du compte (e-mails, SMS et notifications suivent). */
export async function chooseLanguage(code: Locale, isAuthenticated: boolean): Promise<void> {
  await setLocale(code);

  if (isAuthenticated) {
    try {
      await profileService.updatePreferences({ preferred_language: code });
    } catch {
      /* la langue de l'app est déjà changée ; le compte suivra à la prochaine occasion */
    }
  }
}

/** FR | EN | AR — le même choix que le menu de langue du site. */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <View style={[styles.row, compact && styles.rowCompact]} accessibilityRole="radiogroup">
      {LOCALES.map((item) => {
        const active = item.code === locale;

        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => void chooseLanguage(item.code, isAuthenticated)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.name}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{compact ? item.short : item.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  rowCompact: { gap: 4 },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  pillTextActive: { color: COLORS.white },
});
