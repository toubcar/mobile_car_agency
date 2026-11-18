import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { API_BASE_URL } from '../constants/api';
import { getLocale } from '@/i18n';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Attach token automatically to every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Le serveur répond (messages, erreurs, notifications) dans la langue choisie dans l'app
    config.headers['Accept-Language'] = getLocale();
    // FormData : laisser axios définir le boundary (sinon application/json casse l’upload Laravel)
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let handling401 = false;

// Session expirée : efface le jeton uniquement (la navigation est gérée par les layouts admin/agence).
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !handling401) {
      const url = String(error.config?.url ?? '');
      const isPublicAuth = /\/auth\/(login|register|phone\/)/.test(url);
      if (!isPublicAuth) {
        handling401 = true;
        try {
          const { useAuthStore } = await import('../store/authStore');
          const { isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated) {
            await useAuthStore.getState().clearSession();
          }
        } finally {
          setTimeout(() => {
            handling401 = false;
          }, 500);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
