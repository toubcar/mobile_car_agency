import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import ReviewsBoard from '@/components/backoffice/ReviewsBoard';
import { ADMIN_BG } from '@/constants/adminTheme';
import { t } from '@/i18n';

/** Les avis des clients de l'agence, auxquels elle répond (page « Avis clients » du site). */
export default function AgencyReviewsScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Avis clients')} subtitle={t('Répondez à vos clients')} />
      <ReviewsBoard mode="agency" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: ADMIN_BG } });
