import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { allowProNavigation } from '@/utils/startupNavigation';
import { useLogout } from '@/hooks/useLogout';
import { bookingsService } from '../../services/bookings.service';
import { carsService } from '../../services/cars.service';
import { useAuthSheet } from '@/contexts/AuthSheetContext';
import { authService } from '@/services/auth.service';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { COLORS } from '@/constants/api';
import { PROFILE_MAX_WIDTH, useResponsiveLayout } from '@/utils/responsiveLayout';

import { t, chevronChar } from '@/i18n';

const MENU: {
  label: string;
  sub: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { get label() { return t('Mes réservations'); }, get sub() { return t('À venir et passées'); }, route: '/(tabs)/bookings', icon: 'calendar-outline' },
  { get label() { return t('Favoris'); }, get sub() { return t('Vos véhicules enregistrés'); }, route: '/(tabs)/wishlists', icon: 'heart-outline' },
  { get label() { return t('Messages'); }, get sub() { return t('Échanges avec les agences'); }, route: '/(tabs)/messages', icon: 'chatbubbles-outline' },
  { get label() { return t('Notifications'); }, get sub() { return t('Réservations, paiements, messages'); }, route: '/notifications', icon: 'notifications-outline' },
  { get label() { return t('Assistance'); }, get sub() { return t('Vos tickets et notre équipe'); }, route: '/support', icon: 'help-buoy-outline' },
  { get label() { return t('Voir mon profil'); }, get sub() { return t('Nom, photo et infos publiques'); }, route: '/view-profile', icon: 'person-outline' },
  { get label() { return t('Paramètres du compte'); }, get sub() { return t('Sécurité, notifications, paiements'); }, route: '/account-settings', icon: 'settings-outline' },
];

function getDisplayIdentity(user: { email?: string; phone?: string } | null): string {
  if (!user) return '';
  const email = user.email ?? '';
  if (email && !email.includes('@toubcar.app')) return email;
  if (user.phone) return user.phone;
  return '';
}

function formatDisplayName(rawName: string): string {
  return rawName
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
  isLast,
  isCompact,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string;
  onPress: () => void;
  isLast?: boolean;
  isCompact: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowBorder, isCompact && styles.menuRowCompact]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={isCompact ? 16 : 18} color={COLORS.primary} />
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuLabel, isCompact && styles.menuLabelCompact]} numberOfLines={2}>{label}</Text>
        <Text style={styles.menuSub} numberOfLines={2}>{sub}</Text>
      </View>
      <Text style={styles.chevron}>{chevronChar()}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout({ maxWidth: PROFILE_MAX_WIDTH, withTabBar: true });
  const { isCompact, contentWidth, scrollContentStyle, headerGradientHeight } = layout;

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logoutAndGoHome = useLogout();
  const { openAuthSheet } = useAuthSheet();

  const { data: bookings } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: () => bookingsService.getBookings(user),
    enabled: isAuthenticated && role === 'client',
  });
  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => carsService.getFavorites(),
    enabled: isAuthenticated && role === 'client',
  });

  const resendVerification = async () => {
    try {
      const result = await authService.resendVerification();
      useAuthStore.getState().updateUser({ email_verified: result.data.email_verified });
      Alert.alert(t('E-mail envoyé'), result.message);
    } catch {
      Alert.alert(t('Erreur'), t('Envoi impossible.'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('Déconnexion'), t('Voulez-vous vraiment vous déconnecter ?'), [
      { text: t('Annuler'), style: 'cancel' },
      {
        text: t('Se déconnecter'),
        style: 'destructive',
        onPress: () => {
          void logoutAndGoHome();
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient colors={['#C8E6F5', COLORS.background]} style={[styles.headerGradient, { height: headerGradientHeight }]} />
        <ScrollView
          contentContainerStyle={[styles.guestScroll, scrollContentStyle]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.guestCard, { maxWidth: contentWidth, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person-outline" size={40} color={COLORS.secondary} />
            </View>
            <Text style={[styles.guestTitle, isCompact && styles.guestTitleCompact]}>{t('Bienvenue sur ToubCar')}</Text>
            <Text style={styles.guestSub}>
              {t('Connectez-vous ou créez un compte pour accéder à toutes les fonctionnalités.')}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => openAuthSheet('login')} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('Se connecter')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => openAuthSheet('signup')} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>{t('Créer un compte')}</Text>
            </TouchableOpacity>
            <View style={{ marginTop: 18, alignSelf: 'stretch' }}>
              <LanguageSwitcher />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const displayName = formatDisplayName(user?.name ?? 'Utilisateur');
  const initials = displayName
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const identity = getDisplayIdentity(user);

  const stats = [
    { value: String(bookings?.length ?? 0), label: t('Locations'), route: '/(tabs)/bookings' as const },
    { value: String(favorites?.length ?? 0), label: t('Favoris'), route: '/(tabs)/wishlists' as const },
    {
      value: String(bookings?.filter((b) => b.status === 'completed').length ?? 0),
      label: t('Terminées'),
      route: '/(tabs)/bookings' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#C8E6F5', COLORS.background]} style={[styles.headerGradient, { height: headerGradientHeight }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, scrollContentStyle, { maxWidth: contentWidth }]}
      >
        <Text style={[styles.pageTitle, isCompact && styles.pageTitleCompact]}>{t('Profil')}</Text>

        {user && user.email_verified === false ? (
          <View style={styles.verifyBanner}>
            <Ionicons name="mail-unread-outline" size={22} color="#92400E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>{t('Confirmez votre adresse e-mail')}</Text>
              <Text style={styles.verifySub}>{t('Un lien de confirmation vous a été envoyé à :email.', { email: user.email })}</Text>
            </View>
            <TouchableOpacity onPress={resendVerification} activeOpacity={0.8}>
              <Text style={styles.verifyAction}>{t('Renvoyer')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.heroCard, isCompact && styles.heroCardCompact]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={[styles.avatar, isCompact && styles.avatarCompact]}
          >
            <Text style={[styles.avatarText, isCompact && styles.avatarTextCompact]}>{initials}</Text>
          </LinearGradient>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
            {identity ? <Text style={styles.heroSub} numberOfLines={1}>{identity}</Text> : null}
            {role === 'agence' ? (
              <View style={styles.roleBadge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Text style={styles.roleBadgeText}>{t('Agence partenaire')}</Text>
              </View>
            ) : null}
            {role === 'admin' ? (
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                <Text style={styles.roleBadgeText}>{t('Administrateur')}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.editAvatarBtn}
            onPress={() => router.push('/settings/personal-info')}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={15} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          {stats.map((s, i) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.statItem, isCompact && styles.statItemCompact, i < stats.length - 1 && styles.statDivider]}
              activeOpacity={0.75}
              onPress={() => router.push(s.route as any)}
            >
              <Text style={[styles.statValue, isCompact && styles.statValueCompact]}>{s.value}</Text>
              <Text style={[styles.statLabel, isCompact && styles.statLabelCompact]} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(role === 'admin' || role === 'agence') && (
          <>
            <Text style={styles.sectionLabel}>{t('Espace pro')}</Text>
            <View style={styles.card}>
              <MenuRow
                icon={role === 'admin' ? 'grid-outline' : 'business-outline'}
                label={role === 'admin' ? t('Tableau de bord admin') : t('Espace agence')}
                sub={t('Gestion, statistiques, réservations')}
                onPress={() => {
                  allowProNavigation();
                  router.replace(role === 'admin' ? '/(admin)/(dashboard)' : '/(agence)');
                }}
                isLast
                isCompact={isCompact}
              />
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>{t('Compte')}</Text>
        <View style={styles.card}>
          {MENU.map((item, i) => (
            <MenuRow
              key={item.route}
              icon={item.icon}
              label={item.label}
              sub={item.sub}
              onPress={() => router.push(item.route as any)}
              isLast={i === MENU.length - 1}
              isCompact={isCompact}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.75}>
          <Text style={styles.signOutText}>{t('Se déconnecter')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{t('ToubCar · v1.0.0')}</Text>
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
    height: 200,
  },
  scrollContent: { flexGrow: 1 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFBEB', borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', padding: 14, marginBottom: 14 },
  verifyTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  verifySub: { fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 17 },
  verifyAction: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pageTitleCompact: { fontSize: 22, paddingBottom: 12 },

  guestScroll: { flexGrow: 1, justifyContent: 'center', paddingTop: 40 },
  guestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  guestAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  guestTitleCompact: { fontSize: 19 },
  guestSub: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  heroCardCompact: { padding: 12, flexWrap: 'wrap' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarCompact: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  avatarTextCompact: { fontSize: 18 },
  heroInfo: { flex: 1, marginLeft: 14, minWidth: 0 },
  heroName: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  heroSub: { fontSize: 13, color: COLORS.gray, marginTop: 3, fontWeight: '500' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  editAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18, minWidth: 0 },
  statItemCompact: { paddingVertical: 14 },
  statDivider: { borderRightWidth: 1, borderRightColor: COLORS.lightGray },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statValueCompact: { fontSize: 18 },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4, fontWeight: '600' },
  statLabelCompact: { fontSize: 10 },

  sectionLabel: {
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
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuRowCompact: { paddingVertical: 11, paddingHorizontal: 12 },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 15, color: COLORS.black, fontWeight: '700' },
  menuLabelCompact: { fontSize: 14 },
  menuSub: { fontSize: 12, color: COLORS.gray, marginTop: 2, fontWeight: '500' },
  chevron: { fontSize: 22, color: COLORS.gray, fontWeight: '300', lineHeight: 22 },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  signOutText: { fontSize: 16, color: COLORS.error, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.gray, marginTop: 4, fontWeight: '500' },
});
