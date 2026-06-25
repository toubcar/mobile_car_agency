import * as SecureStore from 'expo-secure-store';
import apiClient from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    await SecureStore.setItemAsync('auth_token', response.data.token);
    return response.data;
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
      phone,
    });
    await SecureStore.setItemAsync('auth_token', response.data.token);
    return response.data;
  },

  /** Invalide le jeton côté serveur si possible (état local géré par authStore). */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Réseau coupé ou backend arrêté : déconnexion locale gérée par le store.
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ data: User }>('/profile');
    return response.data.data;
  },

  /** `PUT /profile` — aligné sur `car-agency` UserController::update */
  async updateProfile(payload: {
    name?: string;
    phone?: string;
    city?: string;
    address?: string;
  }): Promise<User> {
    const response = await apiClient.put<{ data: User; message?: string }>('/profile', payload);
    return response.data.data;
  },

  /** `POST /auth/phone/send` */
  async sendPhoneOtp(phone: string): Promise<{ message: string; dev_code?: string }> {
    const { data } = await apiClient.post<{ message: string; dev_code?: string }>('/auth/phone/send', { phone });
    return data;
  },

  /** `POST /auth/phone/verify` — enregistre le token Sanctum */
  async verifyPhoneOtp(phone: string, code: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/phone/verify', { phone, code });
    await SecureStore.setItemAsync('auth_token', response.data.token);
    return response.data;
  },

  /** `POST /auth/google` — token d’accès Google (userinfo) */
  async loginWithGoogle(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', { access_token: accessToken });
    await SecureStore.setItemAsync('auth_token', response.data.token);
    return response.data;
  },

  /** `POST /auth/apple` — identity_token JWT Apple */
  async loginWithApple(identityToken: string, fullName?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/apple', {
      identity_token: identityToken,
      ...(fullName != null && fullName !== '' ? { full_name: fullName } : {}),
    });
    await SecureStore.setItemAsync('auth_token', response.data.token);
    return response.data;
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('auth_token');
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('auth_token');
    return !!token;
  },
};
