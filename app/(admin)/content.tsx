import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Chips } from '@/components/backoffice/ui';
import SettingsPanel from '@/components/admin/content/SettingsPanel';
import BannersPanel from '@/components/admin/content/BannersPanel';
import FaqPanel from '@/components/admin/content/FaqPanel';
import PagesPanel from '@/components/admin/content/PagesPanel';
import FeaturedPanel from '@/components/admin/content/FeaturedPanel';

import { t } from '@/i18n';

type Tab = 'settings' | 'banners' | 'faq' | 'pages' | 'featured';

/** The admin's Contenu, as on the website: settings, banners, help, pages (in the three languages) and featured items. */
export default function AdminContentScreen() {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Contenu')} subtitle={t('Le contenu du site et de l\'application')} />
      <View style={styles.tabs}>
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { value: 'settings', label: t('Paramètres') },
            { value: 'banners', label: t('Bannières') },
            { value: 'faq', label: t('FAQ') },
            { value: 'pages', label: t('Pages') },
            { value: 'featured', label: t('À la une') },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {tab === 'settings' ? <SettingsPanel /> : null}
        {tab === 'banners' ? <BannersPanel /> : null}
        {tab === 'faq' ? <FaqPanel /> : null}
        {tab === 'pages' ? <PagesPanel /> : null}
        {tab === 'featured' ? <FeaturedPanel /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  tabs: { paddingHorizontal: 12, paddingTop: 10 },
  scroll: { padding: 14, paddingBottom: 48 },
});
