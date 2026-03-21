import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  AuthCard,
  AuthPageShell,
  authFieldInputClass,
  authFieldLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
} from '../../components/auth/auth-layout';
import { ErrorBanner, LoadingSpinner } from '../../components/feedback';

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
    <AuthPageShell>
      <AuthCard>
        <div className="mb-8">
          <h2 className="mb-2 text-[1.8rem] font-semibold leading-tight">Welcome Back</h2>
          <p className="text-[0.9rem] text-zinc-500">Log in to your 3DAI account</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className={authFieldLabelClass}>Email Address</label>
            <input
              type="email"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldInputClass}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={authFieldLabelClass}>Password</label>
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldInputClass}
              required
            />
          </div>

          <button
            type="button"
            className="cursor-pointer text-right text-sm text-zinc-400 transition-colors hover:text-white"
            onClick={onForgotPasswordClick}
          >
            Forget Password?
          </button>

          <ErrorBanner message={error} onDismiss={() => setError('')} />

          <button
            type="submit"
            className={`${authPrimaryButtonClass} mt-2.5 flex w-full items-center justify-center gap-2`}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner size="sm" />}
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-[0.9rem] text-zinc-500">
          <p>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className={`${authLinkClass} inline border-0 bg-transparent p-0`}
              onClick={onSignupClick}
            >
              Create one
            </button>
          </p>
        </div>
      </AuthCard>
    </AuthPageShell>
  );
};

export default LoginPage;
