import React, { useState } from 'react';
import LandingPage from './pages/landing_page/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ChatArea from './components/chat_area/chat_area';
import './App.css';

const App: React.FC = () => {
    const [view, setView] = useState<'landing' | 'login' | 'chat'>('landing');

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

            {view === 'chat' && (
                <ChatArea />
            )}
        </div>
    );
};

export default App;