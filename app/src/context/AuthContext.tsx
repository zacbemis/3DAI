import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { AuthError, User as SupabaseUser } from '@supabase/supabase-js';

/** Maps Supabase auth errors (incl. HTTP 429 rate limits) to UI-friendly text. */
function formatAuthError(error: AuthError): string {
  if (error.status === 429) {
    return 'Too many sign-in or sign-up attempts. Wait a few minutes, then try again.';
  }
  return error.message || 'Authentication request failed';
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
}

export interface SignupResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only during the initial session restore on app startup. */
  isInitializing: boolean;
  /** True during any auth operation (login, signup, etc.). */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<SignupResult>;
  logout: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(su: SupabaseUser): AuthUser {
  return {
    id: su.id,
    email: su.email ?? '',
    display_name:
      su.user_metadata?.full_name ??
      su.user_metadata?.name ??
      null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? mapUser(session.user) : null);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (data.user) setUser(mapUser(data.user));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string): Promise<SignupResult> => {
      setIsLoading(true);
      try {
        const { data, error } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } },
        });
        if (error) throw new Error(error.message);

        if (data.session && data.user) {
          setUser(mapUser(data.user));
          return { needsEmailConfirmation: false };
        }

        return { needsEmailConfirmation: true };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await getSupabaseClient().auth.signOut();
    setUser(null);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await getSupabaseClient().auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitializing,
      isLoading,
      login,
      signup,
      logout,
      resendConfirmation,
    }),
    [user, isInitializing, isLoading, login, signup, logout, resendConfirmation],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
