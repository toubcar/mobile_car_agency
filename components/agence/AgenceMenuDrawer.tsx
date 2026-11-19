import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t, chevronChar } from '@/i18n';

const DRAWER_W = Math.min(300, Dimensions.get('window').width * 0.82);

export type AgenceMenuItem = {
  title: string;
  route: string;
};

export const AGENCE_MENU_GROUPS: { title: string; items: AgenceMenuItem[] }[] = [
  {
    get title() { return t('Mon agence'); },
    items: [
      { get title() { return t('Profil agence'); }, route: '/(agence)/agency-profile' },
      { get title() { return t('Rapports'); }, route: '/(agence)/reports' },
      { get title() { return t('Tarification'); }, route: '/(agence)/pricing' },
      { get title() { return t('Annulations'); }, route: '/(agence)/cancellations' },
    ],
  },
  {
    get title() { return t('Flotte'); },
    items: [
      { get title() { return t('Maintenance'); }, route: '/(agence)/maintenance' },
      { get title() { return t('Catégories'); }, route: '/(agence)/categories' },
      { get title() { return t('Sites externes'); }, route: '/(agence)/external-sites' },
    ],
  },
  {
    get title() { return t('Clients et marketing'); },
    items: [
      { get title() { return t('Avis clients'); }, route: '/(agence)/reviews' },
      { get title() { return t('Offres spéciales'); }, route: '/(agence)/offers' },
    ],
  },
  {
    get title() { return t('Finance'); },
    items: [
      { get title() { return t('Finance et virements'); }, route: '/(agence)/finance' },
      { get title() { return t('Compte bancaire'); }, route: '/(agence)/bank-account' },
      { get title() { return t('Commissions ToubCar'); }, route: '/(agence)/commissions' },
    ],
  },
  {
    get title() { return t('Aide et réglages'); },
    items: [
      { get title() { return t('Notifications'); }, route: '/my-notifications' },
      { get title() { return t('Assistance'); }, route: '/assistance' },
      { get title() { return t('Aide'); }, route: '/help' },
      { get title() { return t('Langue'); }, route: '/settings/language' },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AgenceMenuDrawer({ visible, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideX.setValue(-DRAWER_W);
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideX, backdrop]);

  const close = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      after?.();
    });
  };

  const navigate = (route: string) => {
    close(() => router.push(route as any));
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={() => close()}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_W, paddingTop: insets.top, paddingBottom: insets.bottom + 8, transform: [{ translateX: slideX }] },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>{t('Menu')}</Text>
          <Text style={styles.drawerSub}>{t('Espace partenaire')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {AGENCE_MENU_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.row, idx < group.items.length - 1 && styles.rowBorder]}
                    onPress={() => navigate(item.route)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowArrow}>{chevronChar()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  drawerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  drawerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scroll: { paddingTop: 8, paddingBottom: 24 },
  group: { marginTop: 20, paddingHorizontal: 16 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  groupCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowTitle: { fontSize: 16, color: '#111827', fontWeight: '400' },
  rowArrow: { fontSize: 20, color: '#C7C7CC', fontWeight: '300', marginTop: -2 },
});
