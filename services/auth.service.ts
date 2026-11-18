import { tokenStorage } from './tokenStorage';
import apiClient from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    await tokenStorage.set(response.data.token);
    return response.data;
  },

  /** Inscription client, ou agence partenaire (`extras.role` : compte en attente de validation par l'administrateur). */
  async register(
    name: string,
    email: string,
    password: string,
    phone?: string,
    extras?: {
      role?: 'agence';
      address?: string;
      city?: string;
      quartier?: string;
    },
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
      password_confirmation: password,
      phone,
      ...(extras?.role ? { role: extras.role } : {}),
      ...(extras?.address ? { address: extras.address } : {}),
      ...(extras?.city ? { city: extras.city } : {}),
      ...(extras?.quartier ? { quartier: extras.quartier } : {}),
    });
    await tokenStorage.set(response.data.token);
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

  /** `POST /auth/forgot-password` — le lien de réinitialisation arrive par e-mail et s'ouvre sur le site. */
  async forgotPassword(email: string): Promise<string> {
    const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return data.message;
  },

  /** `POST /auth/email/resend` — renvoie l'e-mail de vérification. */
  async resendVerification(): Promise<{ message: string; data: User }> {
    const { data } = await apiClient.post<{ message: string; data: User }>('/auth/email/resend');
    return data;
  },

  /** `POST /auth/phone/send` */
  async sendPhoneOtp(phone: string): Promise<{ message: string; dev_code?: string }> {
    const { data } = await apiClient.post<{ message: string; dev_code?: string }>('/auth/phone/send', { phone });
    return data;
  },

  /** `POST /auth/phone/verify` — enregistre le token Sanctum */
  async verifyPhoneOtp(phone: string, code: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/phone/verify', { phone, code });
    await tokenStorage.set(response.data.token);
    return response.data;
  },

  /** `POST /auth/google` — token d’accès Google (userinfo) */
  async loginWithGoogle(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', { access_token: accessToken });
    await tokenStorage.set(response.data.token);
    return response.data;
  },

  /** `POST /auth/apple` — identity_token JWT Apple */
  async loginWithApple(identityToken: string, fullName?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/apple', {
      identity_token: identityToken,
      ...(fullName != null && fullName !== '' ? { full_name: fullName } : {}),
    });
    await tokenStorage.set(response.data.token);
    return response.data;
  },

  async getToken(): Promise<string | null> {
    return tokenStorage.get();
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await tokenStorage.get();
    return !!token;
  },
};
