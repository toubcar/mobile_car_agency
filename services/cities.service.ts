import apiClient from './api';
import { getLocale } from '@/i18n';

/** A city offered while the customer types a place (same list as the website's search bar) */
export interface CitySuggestion {
  /** The value to search for (the city's French spelling) */
  name: string;
  /** The name to show, in the customer's language */
  label: string;
  country: string;
  /** Cars that can be booked there */
  cars: number;
  agencies: number;
  /** "12 voitures disponibles · Maroc" */
  subtitle: string;
}

export const citiesService = {
  /** Any spelling finds the city (fes, Fez, فاس); nothing typed gives the cities with the most cars */
  async search(q: string): Promise<CitySuggestion[]> {
    const { data } = await apiClient.get<{ cities?: CitySuggestion[] }>('/cities/search', { params: { q, lang: getLocale() } });
    return data.cities ?? [];
  },
};
