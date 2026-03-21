import React, { useState } from 'react';
import LandingPage from './pages/landing_page/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import ChatArea from './components/chat_area/chat_area';
import './App.css';

const App: React.FC = () => {
    const [view, setView] = useState<'landing' | 'login' | 'chat' | 'signup'>('landing');

    return (
        <div className="app-viewport">
            {view === 'landing' && (
                <LandingPage onLoginClick={() => setView('login')} />
            )}
            
            {view === 'login' && (
                <LoginPage 
                    onSignupClick={() => setView('signup')} 
                    onLoginSuccess={() => setView('chat')} 
                />
            )}

            {view === 'signup' && (
                <SignupPage 
                    onSignupSuccess={() => setView('login')} 
                    onBackToLogin={() => setView('login')} 
                />
            )}

            {view === 'chat' && (
                <ChatArea />
            )}
        </div>
    );
};

export default App;