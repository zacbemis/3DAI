import { useState } from 'react';
import { LandingPage } from './pages/landing_page/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import ChatArea from './components/chat_area/chat_area';
import './App.css';

const App: React.FC = () => {
    const [view, setView] = useState<'landing' | 'login' | 'chat' | 'signup' | 'resetpassword'>('landing');

    return (
        <div className="app-viewport">
            {view === 'landing' && (
                <LandingPage onLoginClick={() => setView('login')} />
            )}
            
            {view === 'login' && (
                <LoginPage 
                    onSignupClick={() => setView('signup')} 
                    onLoginSuccess={() => setView('chat')} 
                    onForgotPasswordClick={() => setView('resetpassword')}
                />
            )}

  return (
    <div className="app-viewport">
      {view === 'landing' && (
        <LandingPage onLoginClick={() => setView('login')} onChatClick={() => setView('chat')} />
      )}

            {view === 'resetpassword' && (
                <ResetPassword
                onBackToLogin={() => setView('login')} 
                />
            )}

            {view === 'chat' && (
                <ChatArea />
            )}
        </div>
    );
};

      {view === 'chat' && <ChatPage />}
    </div>
  );
}
