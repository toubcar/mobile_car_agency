import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/api';
import type { Translated } from '@/services/admin-content.service';
import { Field } from '@/components/backoffice/ui';
import { t } from '@/i18n';

const LANGS = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
] as const;

/**
 * A text the admin writes in the site's three languages: French is required, an empty translation shows the French
 * text to the visitors of that language (as on the website's Contenu pages).
 */
export default function TranslatedField({ label, value, onChange, multiline, maxLength, hint }: {
  label: string;
  value: Translated;
  onChange: (value: Translated) => void;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  const [lang, setLang] = useState<'fr' | 'en' | 'ar'>('fr');

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.tabs}>
          {LANGS.map((l) => {
            const filled = !!value[l.code]?.trim();
            return (
              <TouchableOpacity key={l.code} style={[styles.tab, lang === l.code && styles.tabOn]} onPress={() => setLang(l.code)} activeOpacity={0.8}>
                <Text style={[styles.tabText, lang === l.code && styles.tabTextOn]}>{l.label}</Text>
                {!filled && l.code !== 'fr' ? <View style={styles.missing} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <Field
        label=""
        value={value[lang] ?? ''}
        onChangeText={(text) => onChange({ ...value, [lang]: text })}
        multiline={multiline}
        maxLength={maxLength}
        style={[multiline && { minHeight: 140 }, lang === 'ar' && styles.rtl]}
        placeholder={lang === 'fr' ? undefined : t('Pas encore traduit : le français est affiché')}
        hint={hint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -6 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  tabs: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 999, padding: 2 },
  tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  tabTextOn: { color: COLORS.primary },
  missing: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
