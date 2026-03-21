import { useState } from 'react';
import LoginPage from './pages/LoginPage/LoginPage';
import { ChatPage } from './pages/chat/ChatPage';
import { LandingPage } from './pages/landing_page/LandingPage';
import './index.css';
import './App.css';

type View = 'landing' | 'login' | 'chat';

export function App() {
  const [view, setView] = useState<View>('landing');

  return (
    <div className="app-viewport">
      {view === 'landing' && (
        <LandingPage onLoginClick={() => setView('login')} />
      )}
      {view === 'login' && (
        <LoginPage
          onBackClick={() => setView('landing')}
          onLoginSuccess={() => setView('chat')}
        />
      )}
      {view === 'chat' && <ChatPage />}
    </div>
  );
}
