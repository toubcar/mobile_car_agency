import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AuthBottomSheet from '@/components/AuthBottomSheet';
import { useAuthStore } from '@/store/authStore';

import { t } from '@/i18n';

export type AuthSheetMode = 'signup' | 'login';

type AuthSheetContextValue = {
  openAuthSheet: (mode?: AuthSheetMode, redirectAfterLogin?: string) => void;
  closeAuthSheet: () => void;
};

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null);

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<AuthSheetMode>('signup');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);
  const [openId, setOpenId] = useState(0);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const openAuthSheet = useCallback((nextMode: AuthSheetMode = 'signup', redirect?: string) => {
    setMode(nextMode);
    setRedirectAfterLogin(redirect ?? null);
    setOpenId((id) => id + 1);
    setVisible(true);
  }, []);

  const closeAuthSheet = useCallback(() => {
    setVisible(false);
    setRedirectAfterLogin(null);
  }, []);

  // Ferme le sheet après login / logout pour éviter un état bloqué (ex. après déconnexion agence).
  useEffect(() => {
    setVisible(false);
    setRedirectAfterLogin(null);
  }, [isAuthenticated]);

  return (
    <AuthSheetContext.Provider value={{ openAuthSheet, closeAuthSheet }}>
      {children}
      <AuthBottomSheet
        key={openId}
        visible={visible}
        mode={mode}
        onClose={closeAuthSheet}
        redirectAfterLogin={redirectAfterLogin}
      />
    </AuthSheetContext.Provider>
  );
}

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext);
  if (!ctx) {
    throw new Error(t('useAuthSheet must be used within AuthSheetProvider'));
  }
  return ctx;
}
