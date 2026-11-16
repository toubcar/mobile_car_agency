import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import fr from './fr.json';
import en from './en.json';
import ar from './ar.json';

// React Native et le stockage ne sont chargés qu'au moment de s'en servir : t(), tl() et jsLocale()
// restent utilisables partout (utilitaires, tests jest) sans rien d'autre que ce fichier.
const reactNative = () => require('react-native') as typeof import('react-native');
const storage = () =>
  (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;

/**
 * Langues de l'app : les mêmes que le site (français, anglais, arabe).
 *
 * Comme sur le site, la clé d'un texte est le texte français lui-même (le texte entre guillemets, passé à t).
 * Le français n'a donc pas de fichier ; en.json et ar.json contiennent les traductions
 * (les clés communes avec le site reprennent exactement ses traductions).
 * Les paramètres s'écrivent :nom dans le texte, leurs valeurs sont données en second argument.
 */
export type Locale = 'fr' | 'en' | 'ar';

export const LOCALES: { code: Locale; name: string; short: string; rtl: boolean; js: string }[] = [
  { code: 'fr', name: 'Français', short: 'FR', rtl: false, js: 'fr-FR' },
  { code: 'en', name: 'English', short: 'EN', rtl: false, js: 'en-GB' },
  { code: 'ar', name: 'العربية', short: 'AR', rtl: true, js: 'ar-MA' },
];

const STORAGE_KEY = 'app_locale';
// fr.json ne contient que les valeurs de l'API écrites en anglais (catégories, carburants…) : les textes de l'app sont déjà en français
const dictionaries: Record<Locale, Record<string, string>> = { fr, en, ar };

let current: Locale = 'fr';

interface LocaleState {
  locale: Locale;
  /** La langue est prête (lue depuis le stockage) : l'app peut s'afficher. */
  ready: boolean;
}

export const useLocaleStore = create<LocaleState>(() => ({ locale: 'fr', ready: false }));

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'en' || value === 'ar';
}

export function getLocale(): Locale {
  return current;
}

export function isRtlLocale(locale: Locale = current): boolean {
  return LOCALES.find((l) => l.code === locale)?.rtl ?? false;
}

/** Locale pour Intl / toLocaleDateString (fr-FR, en-GB, ar-MA). */
export function jsLocale(): string {
  return LOCALES.find((l) => l.code === current)?.js ?? 'fr-FR';
}

/** Traduit un texte français ; sans traduction connue, le texte est rendu tel quel. */
export function t(key: string, params?: Record<string, string | number | null | undefined>): string {
  let text = dictionaries[current][key] ?? key;

  if (params) {
    for (const name of Object.keys(params)) {
      text = text.split(`:${name}`).join(String(params[name] ?? ''));
    }
  }

  return text;
}

/** Une valeur venue de l'API (catégorie, carburant, ville…) : traduite si on la connaît, sinon telle quelle. */
export function tl<T>(value: T): T | string {
  if (typeof value !== 'string' || value === '') return value;

  const dictionary = dictionaries[current];

  // 'automatic', 'Automatic' and 'AUTOMATIC' are the same value for the API's users
  return dictionary[value] ?? dictionary[value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()] ?? value;
}

/** Hook : la langue courante (l'écran se redessine quand elle change). */
export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale);
}

function apply(locale: Locale): void {
  current = locale;
  useLocaleStore.setState({ locale });
}

/** À appeler une fois au démarrage, avant d'afficher l'app. Le français est la langue par défaut, comme sur le site. */
export async function initI18n(): Promise<void> {
  const { I18nManager } = reactNative();

  try {
    const saved = await storage().getItem(STORAGE_KEY);
    if (isLocale(saved)) {
      apply(saved);
    }
  } catch {
    /* stockage indisponible : français */
  }

  // Le sens de lecture natif suit la langue ; il ne change qu'au démarrage suivant de l'app
  const rtl = isRtlLocale();
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }

  useLocaleStore.setState({ ready: true });
}

/**
 * Change la langue de l'app. Passer de ou vers l'arabe change le sens de lecture, que le système
 * n'applique qu'au rechargement : en développement l'app se recharge seule, sinon on demande de la rouvrir.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (locale === current) return;

  const { Alert, DevSettings, I18nManager } = reactNative();

  try {
    await storage().setItem(STORAGE_KEY, locale);
  } catch {
    /* la langue reste valable jusqu'à la fermeture de l'app */
  }

  const directionChanges = isRtlLocale(locale) !== I18nManager.isRTL;
  apply(locale);

  if (directionChanges) {
    I18nManager.allowRTL(isRtlLocale(locale));
    I18nManager.forceRTL(isRtlLocale(locale));

    if (__DEV__) {
      DevSettings.reload();
    } else {
      Alert.alert(t('Langue modifiée'), t('Fermez puis rouvrez l\'application pour appliquer le sens de lecture.'));
    }
  }
}

type IconName = ComponentProps<typeof Ionicons>['name'];

const MIRRORED: Partial<Record<string, string>> = {
  'chevron-forward': 'chevron-back',
  'chevron-back': 'chevron-forward',
  'arrow-forward': 'arrow-back',
  'arrow-back': 'arrow-forward',
  'arrow-forward-circle': 'arrow-back-circle',
  'arrow-back-circle': 'arrow-forward-circle',
  'caret-forward': 'caret-back',
  'caret-back': 'caret-forward',
};

/** Une icône qui indique un sens (suite, retour) : inversée en arabe, où l'on lit de droite à gauche. */
export function dirIcon(name: IconName): IconName {
  const rtl = (require('react-native') as typeof import('react-native')).I18nManager.isRTL;

  return rtl ? ((MIRRORED[name] ?? name) as IconName) : name;
}

/** Le chevron › des listes, dans le sens de lecture. */
export function chevronChar(): string {
  return (require('react-native') as typeof import('react-native')).I18nManager.isRTL ? '‹' : '›';
}
