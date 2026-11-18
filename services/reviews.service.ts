import apiClient from './api';
import type { BackofficeReview } from '../types';

export interface ReviewsStatistics {
  total: number;
  published: number;
  hidden: number;
  without_reply: number;
  average_rating: number;
}

export interface ReviewsPage {
  data: BackofficeReview[];
  statistics: ReviewsStatistics;
  current_page: number;
  last_page: number;
  total: number;
}

export interface ReviewFilters {
  rating?: number;
  visibility?: 'published' | 'hidden';
  replied?: 'yes' | 'no';
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Les avis dans l'espace agence et admin, mêmes règles que le site : l'agence lit ceux de ses locations et y répond
 * (une réponse publique par avis) ; l'admin les lit tous, masque ceux qui ne respectent pas les règles ou les supprime.
 */
export const reviewsService = {
  async list(filters: ReviewFilters = {}): Promise<ReviewsPage> {
    const { data } = await apiClient.get<ReviewsPage>('/reviews', { params: filters });
    return data;
  },

  async reply(id: number, reply: string): Promise<BackofficeReview> {
    const { data } = await apiClient.put<{ data: BackofficeReview }>(`/reviews/${id}/reply`, { reply });
    return data.data;
  },

  async removeReply(id: number): Promise<BackofficeReview> {
    const { data } = await apiClient.delete<{ data: BackofficeReview }>(`/reviews/${id}/reply`);
    return data.data;
  },

  async publish(id: number): Promise<BackofficeReview> {
    const { data } = await apiClient.patch<{ data: BackofficeReview }>(`/reviews/${id}/publish`);
    return data.data;
  },

  async hide(id: number): Promise<BackofficeReview> {
    const { data } = await apiClient.patch<{ data: BackofficeReview }>(`/reviews/${id}/hide`);
    return data.data;
  },

  async destroy(id: number): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },
};
