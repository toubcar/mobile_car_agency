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

export const adminContentService = {
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
