import React, { useState } from 'react';
import './LoginPage.css';

interface LoginPageProps {
    onBackClick: () => void;
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBackClick, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // If valid, trigger the view change in App.tsx
        onLoginSuccess();
    };

    return (
        <div className="login-page-wrapper">
            {/* The Back Button */}
            <button className="back-nav-btn" onClick={onBackClick}>
                ← Back
            </button>

            <div className="login-card">
                <h1 className="hero-title">Login</h1>
                <p className="hero-description">Enter your credentials to continue</p>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <input 
                            type="email" 
                            placeholder="Email (anha@gmail.com)" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" className="start-btn">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;