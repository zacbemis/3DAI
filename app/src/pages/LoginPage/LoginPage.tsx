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
import { validateEmail } from '../../lib/validation';
import logo from '../../assets/logo_transparent.png';

interface LoginPageProps {
  onSignupClick: () => void;
  onLoginSuccess: () => void;
  onForgotPasswordClick: () => void;
}

function isEmailNotConfirmedError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('email not confirmed') || lower.includes('email_not_confirmed');
}

const LoginPage: React.FC<LoginPageProps> = ({
  onSignupClick,
  onLoginSuccess,
  onForgotPasswordClick,
}) => {
  const { login, resendConfirmation, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showUnverified, setShowUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowUnverified(false);

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError('Password is required'); return; }

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (isEmailNotConfirmedError(msg)) {
        setShowUnverified(true);
      } else {
        setError(msg);
      }
    }
  };

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      await resendConfirmation(email);
      setResendStatus('sent');
    } catch {
      setResendStatus('idle');
    }
  };

  return (
    <AuthPageShell>
      <AuthCard>
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="3DAI" className="mb-4 h-14 w-auto object-contain" />
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

          {showUnverified && (
            <div
              className="flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200"
              role="alert"
            >
              <p>
                Your email hasn&apos;t been verified yet. Check your inbox for the confirmation link, click it in your browser, then come back here and sign in.
              </p>
              <button
                type="button"
                className="self-start text-sm font-medium text-amber-300 transition-colors hover:text-amber-100 disabled:text-amber-500"
                onClick={handleResend}
                disabled={resendStatus !== 'idle'}
              >
                {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'Confirmation email resent ✓' : 'Resend confirmation email'}
              </button>
            </div>
          )}

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
