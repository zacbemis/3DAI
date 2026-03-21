import { useState } from 'react';
import { ChatPage } from './pages/chat/ChatPage';
import { LandingPage } from './pages/landing_page/LandingPage';

type Screen = 'landing' | 'chat';

export function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  if (screen === 'chat') {
    return <ChatPage />;
  }

  return <LandingPage onGetStarted={() => setScreen('chat')} />;
}
