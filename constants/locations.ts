/** Villes et quartiers prédéfinis (Maroc). */
export const CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Meknès',
  'Oujda',
] as const;

export type CityName = (typeof CITIES)[number];

export const QUARTERS_BY_CITY: Record<CityName, string[]> = {
  Casablanca: [
    'Maarif',
    'Ain Diab',
    'Gauthier',
    'Anfa',
    'Bourgogne',
    'Racine',
    'Derb Sultan',
    'Hay Hassani',
    'Sidi Bernoussi',
    'Aïn Sebaâ',
  ],
  Rabat: [
    'Agdal',
    'Hassan',
    'Hay Riad',
    'Souissi',
    'Les Orangers',
    'Ocean',
    'Yacoub El Mansour',
    'Akkari',
  ],
  Marrakech: [
    'Guéliz',
    'Hivernage',
    'Médina',
    'Palmeraie',
    'Daoudiate',
    'Massira',
    'Semlalia',
    'Targa',
  ],
  Fès: [
    'Ville Nouvelle',
    'Médina',
    'Narjiss',
    'Saiss',
    'Zouagha',
    'Bensouda',
    'Route d’Imouzzer',
  ],
  Tanger: [
    'Centre-ville',
    'Malabata',
    'Iberia',
    'Marshan',
    'Boukhalef',
    'California',
    'Beni Makada',
  ],
  Agadir: [
    'Talborjt',
    'Nouveau Talborjt',
    'Founty',
    'Hay Mohammadi',
    'Dakhla',
    'Charaf',
    'Sonaba',
  ],
  Meknès: [
    'Hamria',
    'Ville Nouvelle',
    'Médina',
    'Toulal',
    'Ouislane',
    'Sidi Bouzekri',
  ],
  Oujda: [
    'Centre-ville',
    'Lazaret',
    'Hay Al Qods',
    'Sidi Yahya',
    'El Menzeh',
    'Angad',
  ],
};

export function getQuartersForCity(city: string): string[] {
  if ((CITIES as readonly string[]).includes(city)) {
    return QUARTERS_BY_CITY[city as CityName];
  }
  return [];
}
