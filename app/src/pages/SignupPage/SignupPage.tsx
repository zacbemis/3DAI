import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SignupPage.css';

interface SignupPageProps {
  onBackToLogin: () => void;
  onSignupSuccess: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({
  onBackToLogin,
  onSignupSuccess,
}) => {
  const { signup, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email (e.g., name@domain.com)');
      return;
    }
    try {
      await signup(email, password, `${firstName} ${lastName}`.trim());
      onSignupSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <div className="signup-container page-fade-in">
      <div className="signup-card">
        <div className="signup-header">
          <h2>Create Account</h2>
          <p>Join the 3DAI intelligent assistant</p>
        </div>

        <form onSubmit={handleSignup} className="signup-form">
          <div className="name-row">
            <div className="input-field">
              <label>First Name</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="input-field">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="example@gmail.com"
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
              minLength={6}
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.5rem 0' }}>
              {error}
            </p>
          )}

          <button type="submit" className="signup-main-btn" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account?
            <span className="link-text" onClick={onBackToLogin}>
              {' '}
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
