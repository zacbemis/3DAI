import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

interface LoginPageProps {
  onSignupClick: () => void;
  onLoginSuccess: () => void;
  onForgotPasswordClick: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onSignupClick,
  onLoginSuccess,
  onForgotPasswordClick,
}) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email (e.g., name@domain.com)');
      return;
    }
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
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
          <p
            className="forget-password-btn"
            onClick={onForgotPasswordClick}
            style={{ cursor: 'pointer' }}
          >
            Forget Password?
          </p>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.5rem 0' }}>
              {error}
            </p>
          )}

          <button type="submit" className="login-main-btn" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don&apos;t have an account?
            <span className="link-text" onClick={onSignupClick}>
              {' '}
              Create one
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
