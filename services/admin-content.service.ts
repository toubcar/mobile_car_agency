import apiClient from './api';

export interface FeaturedContentItem {
  id: number;
  title: string;
  featured: boolean;
  show_on_homepage: boolean;
  homepage_priority: number;
}

export interface AdminContentOverview {
  settings: Record<string, string>;
  banners: Array<Record<string, string | number>>;
  faqs: Array<Record<string, string | number>>;
  policies: Record<string, string>;
}

/** A text in the site's three languages (French required, the others fall back to French when empty) */
export type Translated = Partial<Record<'fr' | 'en' | 'ar', string>>;

export interface AdminBanner {
  id: number;
  title: Translated;
  subtitle: Translated;
  button_label: Translated;
  link?: string | null;
  image_url?: string | null;
  position: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface AdminFaq {
  id: number;
  category: string;
  question: Translated;
  answer: Translated;
  position: number;
  is_published: boolean;
}

export interface AdminPage {
  id: number;
  slug: string;
  title: Translated;
  content: Translated;
  is_published: boolean;
  updated_at?: string | null;
}

export type SiteSettings = Record<string, string | number | Translated | null>;

export interface BannerForm {
  title: Translated;
  subtitle: Translated;
  button_label: Translated;
  link: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  /** A new picture (the current one is kept otherwise) */
  image?: { uri: string; name: string; type: string; file?: Blob } | null;
  remove_image?: boolean;
}

function translatedEntries(name: string, value: Translated): [string, string][] {
  return (['fr', 'en', 'ar'] as const).map((code) => [`${name}[${code}]`, value[code] ?? '']);
}

function bannerFormData(form: BannerForm): FormData {
  const data = new FormData();
  for (const [key, value] of [
    ...translatedEntries('title', form.title),
    ...translatedEntries('subtitle', form.subtitle),
    ...translatedEntries('button_label', form.button_label),
  ]) data.append(key, value);
  data.append('link', form.link.trim());
  data.append('position', String(form.position));
  data.append('is_active', form.is_active ? '1' : '0');
  data.append('placement', 'home');
  if (form.starts_at) data.append('starts_at', form.starts_at);
  if (form.ends_at) data.append('ends_at', form.ends_at);
  if (form.remove_image) data.append('remove_image', '1');
  if (form.image?.file) data.append('image', form.image.file, form.image.name);
  else if (form.image) data.append('image', { uri: form.image.uri, name: form.image.name, type: form.image.type } as unknown as Blob);
  return data;
}

export const adminContentService = {
  // ── Contenu du site (mêmes règles que l'admin du site, toutes les langues à la fois) ──
  async settings(): Promise<SiteSettings> {
    const { data } = await apiClient.get<{ data: SiteSettings }>('/admin/content/settings');
    return data.data ?? {};
  },

  async saveSettings(values: SiteSettings): Promise<SiteSettings> {
    const { data } = await apiClient.put<{ data: SiteSettings }>('/admin/content/settings', values);
    return data.data ?? {};
  },

  async banners(): Promise<AdminBanner[]> {
    const { data } = await apiClient.get<{ data: AdminBanner[] }>('/admin/content/banners');
    return data.data ?? [];
  },

  async saveBanner(id: number | null, form: BannerForm): Promise<AdminBanner> {
    const url = id ? `/admin/content/banners/${id}` : '/admin/content/banners';
    const { data } = await apiClient.post<{ data: AdminBanner }>(url, bannerFormData(form));
    return data.data;
  },

  async deleteBanner(id: number): Promise<void> {
    await apiClient.delete(`/admin/content/banners/${id}`);
  },

  async faqs(): Promise<{ data: AdminFaq[]; categories: { value: string; label: string }[] }> {
    const { data } = await apiClient.get<{ data: AdminFaq[]; categories: { value: string; label: string }[] }>('/admin/content/faqs');
    return { data: data.data ?? [], categories: data.categories ?? [] };
  },

  async saveFaq(id: number | null, payload: Omit<AdminFaq, 'id'>): Promise<AdminFaq> {
    const { data } = id
      ? await apiClient.put<{ data: AdminFaq }>(`/admin/content/faqs/${id}`, payload)
      : await apiClient.post<{ data: AdminFaq }>('/admin/content/faqs', payload);
    return data.data;
  },

  async deleteFaq(id: number): Promise<void> {
    await apiClient.delete(`/admin/content/faqs/${id}`);
  },

  async pages(): Promise<AdminPage[]> {
    const { data } = await apiClient.get<{ data: AdminPage[] }>('/admin/content/pages');
    return data.data ?? [];
  },

  async savePage(id: number, payload: { title: Translated; content: Translated; is_published: boolean }): Promise<AdminPage> {
    const { data } = await apiClient.put<{ data: AdminPage }>(`/admin/content/pages/${id}`, payload);
    return data.data;
  },

  // ── Mise en avant (véhicules et agences à la une) ──
  async overview(): Promise<AdminContentOverview> {
    const { data } = await apiClient.get<AdminContentOverview>('/admin/content');
    return data;
  },

  async toggleCarFeatured(id: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/cars/${id}/featured`);
    return data.data;
  },

  async toggleCarHomepage(id: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/cars/${id}/homepage`);
    return data.data;
  },

  async updateCarPriority(id: number, priority: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/cars/${id}/priority`, { priority });
    return data.data;
  },

  async toggleAgencyFeatured(id: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/agencies/${id}/featured`);
    return data.data;
  },

  async toggleAgencyHomepage(id: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/agencies/${id}/homepage`);
    return data.data;
  },

  async updateAgencyPriority(id: number, priority: number): Promise<FeaturedContentItem> {
    const { data } = await apiClient.patch<{ data: FeaturedContentItem }>(`/admin/content/agencies/${id}/priority`, { priority });
    return data.data;
  },
};
