import { StyleSheet } from 'react-native';
import { COLORS } from './api';

/** Fond type iOS + ToubCar (aligné profil / réglages client) */
export const ADMIN_BG = '#F2F2F7';

export const adminShadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const adminStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D6D72',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  screenSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...adminShadow.card,
  },
  chevron: {
    color: '#C7C7CC',
  },
});

export { COLORS };
