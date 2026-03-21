import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import UpdatePassword from './pages/UpdatePassword/UpdatePassword'; 
import ChatArea from './components/chat_area/chat_area';
import { getSupabaseClient } from './lib/supabaseClient'; 
import './App.css';

const App: React.FC = () => {
    console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

    const [view, setView] = useState<'landing' | 'login' | 'chat' | 'signup' | 'forgotpassword' | 'updatepassword'>('landing');

    useEffect(() => {
        const supabase = getSupabaseClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log("Password recovery link clicked! Switching view...");
                setView('updatepassword');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="app-viewport">
            {view === 'landing' && (
                <LandingPage onLoginClick={() => setView('login')} />
            )}
            
            {view === 'login' && (
                <LoginPage 
                    onSignupClick={() => setView('signup')} 
                    onLoginSuccess={() => setView('chat')} 
                    onForgotPasswordClick={() => setView('forgotpassword')}
                />
            )}

            {view === 'signup' && (
                <SignupPage 
                    onSignupSuccess={() => setView('login')} 
                    onBackToLogin={() => setView('login')} 
                />
            )}

            {view === 'forgotpassword' && (
                <ResetPassword
                    onBackToLogin={() => setView('login')} 
                />
            )}

            {view === 'updatepassword' && (
                <UpdatePassword 
                    onComplete={() => setView('login')} 
                />
            )}

            {view === 'chat' && (
                <ChatArea />
            )}
        </div>
    );
};

export default App;