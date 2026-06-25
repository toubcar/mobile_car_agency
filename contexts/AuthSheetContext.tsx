import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import AuthBottomSheet from '@/components/AuthBottomSheet';

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

  const openAuthSheet = useCallback((nextMode: AuthSheetMode = 'signup', redirect?: string) => {
    setMode(nextMode);
    setRedirectAfterLogin(redirect ?? null);
    setVisible(true);
  }, []);

  const closeAuthSheet = useCallback(() => {
    setVisible(false);
    setRedirectAfterLogin(null);
  }, []);

  return (
    <AuthSheetContext.Provider value={{ openAuthSheet, closeAuthSheet }}>
      {children}
      <AuthBottomSheet
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
    throw new Error('useAuthSheet must be used within AuthSheetProvider');
  }
  return ctx;
}
