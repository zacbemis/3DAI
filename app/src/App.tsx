import { useState } from 'react';
import LoginPage from './pages/LoginPage/LoginPage';
import { LandingPage } from './pages/landing_page/LandingPage';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import SignupPage from './pages/SignupPage/SignupPage';
import { ChatPage } from './pages/chat/ChatPage';
import './App.css';

type View = 'landing' | 'login' | 'signup' | 'resetpassword' | 'chat';

export function App() {
  const [view, setView] = useState<View>('landing');

  return (
    <div className="app-viewport">
      {view === 'landing' && (
        <LandingPage
          onLoginClick={() => setView('login')}
          onChatClick={() => setView('chat')}
        />
      )}

      {view === 'login' && (
        <LoginPage
          onSignupClick={() => setView('signup')}
          onLoginSuccess={() => setView('chat')}
          onForgotPasswordClick={() => setView('resetpassword')}
        />
      )}

      {view === 'signup' && (
        <SignupPage
          onBackToLogin={() => setView('login')}
          onSignupSuccess={() => setView('login')}
        />
      )}

      {view === 'resetpassword' && (
        <ResetPassword onBackToLogin={() => setView('login')} />
      )}

      {view === 'chat' && <ChatPage />}
    </div>
  );
}
