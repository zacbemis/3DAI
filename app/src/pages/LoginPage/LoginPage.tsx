import React, { useState } from 'react';
import './LoginPage.css';

interface LoginPageProps {
    onSignupClick: () => void;
    onLoginSuccess: () => void;
    onForgotPasswordClick: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({onSignupClick, onLoginSuccess, onForgotPasswordClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Syntax Validation (Regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage("Please enter a valid email (e.g., name@domain.com)");
            return;
        }

        console.log("Logging in with:", email);
        onLoginSuccess();
    };

    return (
        <div className="login-container page-fade-in">

            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome Back</h2>
                    <p>Log in to your 3DAI account</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-field">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="example@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div className="input-field">
                        <label>Password</label>
                        <input 
                            type="password" 
                            placeholder="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <p className="forget-password-btn" onClick={onForgotPasswordClick}
                        style={{ cursor: 'pointer' }}>
                        Forget Password?
                    </p>

                    <button type="submit" className="login-main-btn">
                        Sign In
                    </button>

                </form>

                <div className="login-footer">
                    <p>Don't have an account? 
                        <span className="link-text" onClick={onSignupClick}> Create one</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;