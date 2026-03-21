import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// TODO: Replace stub implementations with Supabase auth calls:
//   - login  → supabase.auth.signInWithPassword({ email, password })
//   - signup → supabase.auth.signUp({ email, password, options: { data: { full_name } } })
//   - logout → supabase.auth.signOut()
//   - Initialise user from supabase.auth.getSession() on mount
//   - Listen for changes via supabase.auth.onAuthStateChange()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Stub: accept any credentials, create a fake user
      await new Promise((r) => setTimeout(r, 300));
      setUser({
        id: crypto.randomUUID(),
        email,
        display_name: email.split('@')[0],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, _password: string, displayName: string) => {
      setIsLoading(true);
      try {
        await new Promise((r) => setTimeout(r, 300));
        setUser({
          id: crypto.randomUUID(),
          email,
          display_name: displayName,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      signup,
      logout,
    }),
    [user, isLoading, login, signup, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
