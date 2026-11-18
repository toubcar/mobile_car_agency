import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import ReviewsBoard from '@/components/backoffice/ReviewsBoard';
import { ADMIN_BG } from '@/constants/adminTheme';
import { t } from '@/i18n';

/** Modération des avis (page « Avis » de l'admin du site) : masquer, afficher à nouveau, supprimer. */
export default function AdminReviewsScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Avis')} subtitle={t('Modération des avis clients')} />
      <ReviewsBoard mode="admin" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: ADMIN_BG } });
