import { create } from 'zustand';
import { tokenStorage } from '../services/tokenStorage';
import { User } from '../types';
import { authService } from '../services/auth.service';

function normalizeSessionUser(user: User): User {
  return {
    ...user,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  /** Session restaurée depuis SecureStore (évite redirection admin/agence trop tôt). */
  isAuthReady: boolean;
  isAuthenticated: boolean;
  role: 'client' | 'agence' | 'admin' | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string, agency?: { address: string; city: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Jeton invalide / 401 — remet l’app en invité sans appeler l’API logout. */
  clearSession: () => Promise<void>;
  loadUser: () => Promise<void>;
  loginWithToken: (token: string, user: User) => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthReady: false,
  isAuthenticated: false,
  role: null,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(email, password);
      const user = normalizeSessionUser(response.user);
      set({ user, isAuthenticated: true, role: user.role });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password, phone, agency) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(name, email, password, phone, agency);
      const user = normalizeSessionUser(response.user);
      set({ user, isAuthenticated: true, role: user.role });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSession: async () => {
    try {
      await tokenStorage.clear();
    } catch {
      // Clé déjà absente ou erreur stockage — on efface quand même l’état app.
    }
    set({ user: null, isAuthenticated: false, role: null });
  },

  logout: async () => {
    set({ isLoading: true });
    // État invité tout de suite (évite un profil « connecté » si l’API ou SecureStore échoue).
    set({ user: null, isAuthenticated: false, role: null });
    try {
      await authService.logout();
    } finally {
      try {
        await tokenStorage.clear();
      } catch {
        /* déjà supprimé */
      }
      set({ isLoading: false });
    }
  },

  loadUser: async () => {
    try {
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        try {
          const user = normalizeSessionUser(await authService.getProfile());
          set({ user, isAuthenticated: true, role: user.role });
        } catch {
          await get().clearSession();
        }
      }
    } finally {
      set({ isAuthReady: true });
    }
  },

  loginWithToken: async (token, user) => {
    const u = normalizeSessionUser(user);
    set({ user: u, isAuthenticated: true, role: u.role });
  },

  updateUser: (partial) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : state.user,
      role: partial.role ?? state.role,
    }));
  },
}));
