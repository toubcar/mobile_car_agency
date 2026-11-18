import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import { applyLocale, isRtlLocale, jsLocale, t, tl } from '@/i18n';

afterEach(() => applyLocale('fr'));

describe('t()', () => {
  it('rend le texte français tel quel, paramètres remplacés', () => {
    expect(t('Mes réservations')).toBe('Mes réservations');
    expect(t('Agence #:id', { id: 7 })).toBe('Agence #7');
  });

  it('traduit en anglais et en arabe, avec les mêmes paramètres', () => {
    applyLocale('en');
    expect(t('Mes réservations')).toBe('My bookings');
    expect(t('Agence #:id', { id: 7 })).toBe('Agency #7');

    applyLocale('ar');
    expect(t('Mes réservations')).toBe('حجوزاتي');
    expect(t('Agence #:id', { id: 7 })).toContain('7');
  });

  it('garde le texte français quand il n\'y a pas de traduction', () => {
    applyLocale('en');
    expect(t('Un texte que personne n\'a traduit')).toBe('Un texte que personne n\'a traduit');
  });

  it('remplace plusieurs paramètres et ignore un paramètre absent', () => {
    expect(t('Tentative :count sur :max', { count: 2, max: 3 })).toBe('Tentative 2 sur 3');
    expect(t('Tentative :count sur :max', { count: 2, max: undefined })).toBe('Tentative 2 sur ');
  });
});

describe('tl() — les valeurs venues de l\'API', () => {
  it('traduit une catégorie, un carburant ou une boîte, quelle que soit la casse', () => {
    expect(tl('Economy')).toBe('Économique');
    expect(tl('automatic')).toBe('Automatique');
    applyLocale('ar');
    expect(tl('Gasoline')).toBe('بنزين');
    expect(tl('DIESEL')).toBe('ديزل');
  });

  it('rend une valeur inconnue, vide ou non textuelle telle quelle', () => {
    expect(tl('Casablanca')).toBe('Casablanca');
    expect(tl('')).toBe('');
    expect(tl(null)).toBeNull();
    expect(tl(12)).toBe(12);
  });
});

describe('langue', () => {
  it('l\'arabe se lit de droite à gauche, pas le français ni l\'anglais', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('fr')).toBe(false);
    expect(isRtlLocale('en')).toBe(false);
  });

  it('les dates et les montants suivent la langue', () => {
    expect(jsLocale()).toBe('fr-FR');
    applyLocale('en');
    expect(jsLocale()).toBe('en-GB');
    applyLocale('ar');
    expect(jsLocale()).toBe('ar-MA');
  });
});

describe('dictionnaires', () => {
  it('l\'anglais et l\'arabe ont les mêmes textes', () => {
    expect(Object.keys(ar).sort()).toEqual(expect.arrayContaining(Object.keys(en).sort()));
  });

  it('une traduction garde les paramètres du texte français', () => {
    const params = (text: string) => (text.match(/:[A-Za-z_]+/g) ?? []).sort().join(',');

    for (const dictionary of [en, ar] as Record<string, string>[]) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect([key, params(value)]).toEqual([key, params(key)]);
      }
    }
  });
});
