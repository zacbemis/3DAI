import { useCallback, useEffect, useRef, useState } from 'react';
import LoginPage from './pages/LoginPage/LoginPage';
import { LandingPage } from './pages/LandingPage/LandingPage';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import SignupPage from './pages/SignupPage/SignupPage';
import UpdatePassword from './pages/UpdatePassword/UpdatePassword';
import { ChatPage } from './pages/chat/ChatPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { getSupabaseClient } from './lib/supabaseClient';
import { LoadingScreen, ErrorBoundary } from './components/feedback';
import type { AuthChangeEvent } from '@supabase/supabase-js';

type View =
  | 'landing'
  | 'login'
  | 'signup'
  | 'resetpassword'
  | 'updatepassword'
  | 'chat';

function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [view, setView] = useState<View>('landing');
  const pendingView = useRef<View | null>(null);
  const sessionRestored = useRef(false);

  useEffect(() => {
    if (!isInitializing && !sessionRestored.current) {
      sessionRestored.current = true;
      if (isAuthenticated) {
        setView('chat');
      }
    }
  }, [isInitializing, isAuthenticated]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('updatepassword');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = useCallback(
    (target: View) => {
      const protectedViews: View[] = ['chat'];
      if (protectedViews.includes(target) && !isAuthenticated) {
        pendingView.current = target;
        setView('login');
        return;
      }
      pendingView.current = null;
      setView(target);
    },
    [isAuthenticated],
  );

  const onLoginSuccess = useCallback(() => {
    const dest = pendingView.current ?? 'chat';
    pendingView.current = null;
    setView(dest);
  }, []);

  const onLogout = useCallback(() => {
    setView('landing');
  }, []);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative flex h-screen w-screen flex-col animate-app-viewport">
      {view === 'landing' && (
        <LandingPage
          onLoginClick={() => navigateTo('login')}
          onChatClick={() => navigateTo('chat')}
          onLogout={onLogout}
        />
      )}

      {view === 'login' && (
        <LoginPage
          onSignupClick={() => navigateTo('signup')}
          onLoginSuccess={onLoginSuccess}
          onForgotPasswordClick={() => navigateTo('resetpassword')}
        />
      )}

      {view === 'signup' && (
        <SignupPage
          onBackToLogin={() => navigateTo('login')}
          onSignupSuccess={onLoginSuccess}
        />
      )}

      {view === 'resetpassword' && (
        <ResetPassword onBackToLogin={() => navigateTo('login')} />
      )}

      {view === 'updatepassword' && (
        <UpdatePassword onComplete={() => navigateTo('login')} />
      )}

      {view === 'chat' && (isAuthenticated ? <ChatPage /> : null)}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <AppRoutes />
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
