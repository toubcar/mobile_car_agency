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

export type AdminMenuItem = {
  title: string;
  route: string;
};

/** Modules stack hors onglets — uniquement écrans connectés au backend. */
export const ADMIN_MENU_GROUPS: { title: string; items: AdminMenuItem[] }[] = [
  {
    get title() { return t('Relations'); },
    items: [
      { get title() { return t('Agences partenaires'); }, route: '/(admin)/agencies' },
      { get title() { return t('Clients & avis'); }, route: '/(admin)/customers' },
      { get title() { return t('Avis'); }, route: '/(admin)/reviews' },
      { get title() { return t('Support'); }, route: '/(admin)/support' },
    ],
  },
  {
    get title() { return t('Finance et analyses'); },
    items: [
      { get title() { return t('Finance'); }, route: '/(admin)/finance' },
      { get title() { return t('Commissions ToubCar'); }, route: '/(admin)/commissions' },
      { get title() { return t('Rapports et exports'); }, route: '/(admin)/reports' },
      { get title() { return t('Concurrents'); }, route: '/(admin)/competitors' },
    ],
  },
  {
    get title() { return t('Plateforme'); },
    items: [
      { get title() { return t('Contenu'); }, route: '/(admin)/content' },
      { get title() { return t('Notifications'); }, route: '/(admin)/notifications' },
      { get title() { return t('Système'); }, route: '/(admin)/system' },
      { get title() { return t('Aide'); }, route: '/help' },
      { get title() { return t('Langue'); }, route: '/settings/language' },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AdminMenuDrawer({ visible, onClose }: Props) {
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
          <Text style={styles.drawerSub}>{t('Modules opérationnels')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {ADMIN_MENU_GROUPS.map((group) => (
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
