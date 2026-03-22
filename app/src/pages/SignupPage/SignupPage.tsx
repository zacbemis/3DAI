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
import { PasswordRequirements } from '../../components/auth/PasswordRequirements';
import { validateEmail, validatePassword } from '../../lib/validation';
import logo from '../../assets/logo_transparent.png';

interface SignupPageProps {
  onBackToLogin: () => void;
  onSignupSuccess: () => void;
}

export function SignupPage({
  onBackToLogin,
  onSignupSuccess,
}: SignupPageProps) {
  const { signup, resendConfirmation, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }

    try {
      const result = await signup(email, password, `${firstName} ${lastName}`.trim());
      if (result.needsEmailConfirmation) {
        setPendingConfirmation(true);
      } else {
        onSignupSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
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

  if (pendingConfirmation) {
    return (
      <AuthPageShell>
        <AuthCard>
          <div className="animate-page-fade-in py-4 text-center">
            <img src={logo} alt="3DAI" className="mx-auto mb-4 h-14 w-auto object-contain" />
            <h2 className="mb-3 text-[1.8rem] font-semibold leading-tight">
              Verify your email
            </h2>
            <p className="mb-1 text-[0.9rem] leading-relaxed text-zinc-500">
              We sent a confirmation link to
            </p>
            <p className="mb-6 font-medium text-indigo-400">{email}</p>

            <div className="mb-8 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-[0.85rem] text-zinc-400">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[0.7rem] font-bold text-indigo-400">1</span>
                <span>Open the email from <strong className="text-zinc-300">3DAI</strong> (check spam if you don't see it)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[0.7rem] font-bold text-indigo-400">2</span>
                <span>Click the <strong className="text-zinc-300">confirmation link</strong> — it will open in your browser</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[0.7rem] font-bold text-indigo-400">3</span>
                <span>Come back to this app and <strong className="text-zinc-300">sign in</strong></span>
              </div>
            </div>

            <button
              type="button"
              className={`${authPrimaryButtonClass} w-full`}
              onClick={onBackToLogin}
            >
              Go to Sign In
            </button>

            <button
              type="button"
              className="mt-3 w-full cursor-pointer border-0 bg-transparent text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-700"
              onClick={handleResend}
              disabled={resendStatus !== 'idle'}
            >
              {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'Email resent ✓' : "Didn't get the email? Resend"}
            </button>
          </div>
        </AuthCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard variant="wide">
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="3DAI" className="mb-4 h-14 w-auto object-contain" />
          <h2 className="mb-2 mt-0 text-[1.8rem] font-semibold leading-tight">Create Account</h2>
          <p className="text-[0.9rem] text-zinc-500">Join the 3DAI intelligent assistant</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div className="flex w-full gap-5">
            <div className="flex flex-1 flex-col gap-2">
              <label className={`${authFieldLabelClass} font-medium`}>First Name</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={authFieldInputClass}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className={`${authFieldLabelClass} font-medium`}>Last Name</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={authFieldInputClass}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={`${authFieldLabelClass} font-medium`}>Email Address</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldInputClass}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={`${authFieldLabelClass} font-medium`}>Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldInputClass}
              required
            />
            <PasswordRequirements password={password} />
          </div>

          <ErrorBanner message={error} onDismiss={() => setError('')} />

          <button
            type="submit"
            className={`${authPrimaryButtonClass} mt-2.5 flex w-full items-center justify-center gap-2 text-base`}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner size="sm" />}
            {isLoading ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-[0.9rem] text-zinc-500">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className={`${authLinkClass} inline border-0 bg-transparent p-0`}
              onClick={onBackToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}
