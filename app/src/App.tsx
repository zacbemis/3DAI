import { useState } from 'react';
import { LandingPage } from './pages/landing_page/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import { ChatPage } from './pages/chat/ChatPage';
import './App.css';

type View = 'landing' | 'login' | 'chat';

export function App() {
  const [view, setView] = useState<View>('landing');

  return (
    <div className="app-viewport">
      {view === 'landing' && (
        <LandingPage onLoginClick={() => setView('login')} onChatClick={() => setView('chat')} />
      )}

      {view === 'login' && (
        <LoginPage
          onSignupClick={() => setView('landing')}
          onLoginSuccess={() => setView('chat')}
        />
      )}

      {view === 'chat' && <ChatPage />}
    </div>
  );
}
