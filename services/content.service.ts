import apiClient from './api';

export interface FaqItem {
  id: number;
  category: string;
  category_label: string;
  question: string;
  answer: string;
}

export interface PageSummary {
  slug: string;
  title: string;
}

export interface SitePage extends PageSummary {
  /** Markdown, dans la langue de l'app (le français quand une traduction manque) */
  content: string;
  url: string;
  updated_at?: string | null;
}

export interface HomeBanner {
  id: number;
  title: string;
  subtitle?: string | null;
  button_label?: string | null;
  /** Une page du site (/cars/search, /faq, /pages/annulation…) ou une adresse complète */
  link?: string | null;
  image_url?: string | null;
}

export interface SiteContacts {
  tagline?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  social: Record<string, string>;
}

/** Ce que l'admin écrit dans Contenu (aide, pages, bannières, coordonnées), dans la langue de l'app. */
export const contentService = {
  async faq(): Promise<FaqItem[]> {
    const { data } = await apiClient.get<{ data: FaqItem[] }>('/content/faq');
    return data.data ?? [];
  },

  async pages(): Promise<PageSummary[]> {
    const { data } = await apiClient.get<{ data: PageSummary[] }>('/content/pages');
    return data.data ?? [];
  },

  async page(slug: string): Promise<SitePage> {
    const { data } = await apiClient.get<{ data: SitePage }>(`/content/pages/${encodeURIComponent(slug)}`);
    return data.data;
  },

  async banners(): Promise<HomeBanner[]> {
    const { data } = await apiClient.get<{ data: HomeBanner[] }>('/content/banners');
    return data.data ?? [];
  },

  async settings(): Promise<SiteContacts> {
    const { data } = await apiClient.get<{ data: SiteContacts }>('/content/settings');
    return { ...data.data, social: data.data?.social ?? {} };
  },
};
