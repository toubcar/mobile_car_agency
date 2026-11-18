import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import Markdown from '@/components/Markdown';
import { COLORS } from '@/constants/api';
import { contentService, type FaqItem } from '@/services/content.service';
import { useOpenSiteLink } from '@/hooks/useOpenSiteLink';
import { useAuthStore } from '@/store/authStore';
import { useAuthSheet } from '@/contexts/AuthSheetContext';

import { t, useLocale, dirIcon, chevronChar } from '@/i18n';

/** Help: the questions the admin publishes (website's /faq), the contact details and the legal pages. */
export default function HelpScreen() {
  const router = useRouter();
  const locale = useLocale();
  const openLink = useOpenSiteLink();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openAuthSheet } = useAuthSheet();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const faq = useQuery({ queryKey: ['content-faq', locale], queryFn: () => contentService.faq() });
  const pages = useQuery({ queryKey: ['content-pages', locale], queryFn: () => contentService.pages() });
  const contacts = useQuery({ queryKey: ['content-settings', locale], queryFn: () => contentService.settings() });

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of faq.data ?? []) if (!seen.has(item.category)) seen.set(item.category, item.category_label);
    return [...seen.entries()];
  }, [faq.data]);

  const items = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (faq.data ?? []).filter((item: FaqItem) =>
      (!category || item.category === category)
      && (!needle || `${item.question} ${item.answer}`.toLocaleLowerCase().includes(needle)),
    );
  }, [faq.data, category, search]);

  const c = contacts.data;
  const whatsapp = c?.whatsapp?.replace(/[^\d]/g, '');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={styles.gradient} />
      <PageHeader title={t('Aide et questions fréquentes')} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('Rechercher dans l\'aide')}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
        </View>

        {categories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[[null, t('Tout')] as const, ...categories].map(([value, label]) => (
              <TouchableOpacity
                key={value ?? 'all'}
                style={[styles.chip, category === value && styles.chipOn]}
                onPress={() => setCategory(value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, category === value && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {faq.isLoading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} /> : null}
        {!faq.isLoading && !items.length ? (
          <Text style={styles.empty}>{(faq.data ?? []).length ? t('Aucune question ne correspond à votre recherche.') : t('L\'aide sera bientôt disponible.')}</Text>
        ) : null}

        <View style={styles.list}>
          {items.map((item) => {
            const expanded = open === item.id;
            return (
              <View key={item.id} style={styles.qa}>
                <TouchableOpacity style={styles.question} onPress={() => setOpen(expanded ? null : item.id)} activeOpacity={0.8} accessibilityState={{ expanded }}>
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.secondary} />
                </TouchableOpacity>
                {expanded ? (
                  <View style={styles.answer}>
                    <Markdown source={item.answer} onLink={openLink} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{t('Une question ?')}</Text>
          <Text style={styles.contactText}>{t('Vous ne trouvez pas votre réponse ? Écrivez-nous depuis l\'assistance de votre espace.')}</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => (isAuthenticated ? router.push('/assistance/new') : openAuthSheet('login', '/assistance/new'))}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
            <Text style={styles.contactBtnText}>{t('Contacter l\'assistance')}</Text>
          </TouchableOpacity>
          {c?.email ? <ContactLine icon="mail-outline" text={c.email} onPress={() => void Linking.openURL(`mailto:${c.email}`)} /> : null}
          {c?.phone ? <ContactLine icon="call-outline" text={c.phone} onPress={() => void Linking.openURL(`tel:${c.phone!.replace(/\s/g, '')}`)} /> : null}
          {whatsapp ? <ContactLine icon="logo-whatsapp" text={t('WhatsApp')} onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)} /> : null}
          {c?.address ? <ContactLine icon="location-outline" text={c.address} /> : null}
        </View>

        {(pages.data ?? []).length ? (
          <>
            <Text style={styles.sectionTitle}>{t('Informations légales')}</Text>
            <View style={styles.pages}>
              {(pages.data ?? []).map((page, i) => (
                <TouchableOpacity
                  key={page.slug}
                  style={[styles.pageRow, i > 0 && styles.pageRowBorder]}
                  onPress={() => router.push(`/pages/${page.slug}` as never)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={18} color={COLORS.secondary} />
                  <Text style={styles.pageTitle}>{page.title}</Text>
                  <Text style={styles.chevron}>{chevronChar()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactLine({ icon, text, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.contactLine} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.contactLineText} selectable>{text}</Text>
      {onPress ? <Ionicons name={dirIcon('chevron-forward')} size={16} color="#9CA3AF" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.lightGray },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.lightGray },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  chipTextOn: { color: '#FFFFFF' },
  empty: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginVertical: 24 },
  list: { gap: 10 },
  qa: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  questionText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 21 },
  answer: { paddingHorizontal: 16, paddingBottom: 16 },
  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: COLORS.lightGray, marginTop: 8 },
  contactTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  contactText: { fontSize: 14, color: COLORS.gray, lineHeight: 20 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 13 },
  contactBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  contactLineText: { flex: 1, fontSize: 14, color: '#111827' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  pages: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: COLORS.lightGray, overflow: 'hidden' },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  pageRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  pageTitle: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' },
  chevron: { fontSize: 20, color: '#C7C7CC' },
});
