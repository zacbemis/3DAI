import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import {
  AuthCard,
  AuthPageShell,
  authFieldInputClass,
  authFieldLabelClass,
  authPrimaryButtonClass,
} from '../../components/auth/auth-layout';
import { ErrorBanner, LoadingSpinner } from '../../components/feedback';
import { validateEmail } from '../../lib/validation';
import logo from '../../assets/logo_transparent.png';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) { setErrorMessage(emailErr); return; }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_TO;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || window.location.origin,
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to send reset link. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <button
        type="button"
        className="absolute left-8 top-10 z-10 border-0 bg-transparent text-base text-zinc-500 transition-colors hover:text-white"
        onClick={onBackToLogin}
      >
        ← Back to Login
      </button>

      <AuthCard>
        {!isSubmitted ? (
          <>
            <div className="mb-8 flex flex-col items-center">
              <img src={logo} alt="3DAI" className="mb-4 h-14 w-auto object-contain" />
              <h2 className="mb-3 text-[1.8rem] font-semibold leading-tight">Reset Password</h2>
              <p className="text-[0.9rem] leading-relaxed text-zinc-500">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

              <div className="flex flex-col gap-2">
                <label className={authFieldLabelClass}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authFieldInputClass}
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className={`${authPrimaryButtonClass} flex w-full items-center justify-center gap-2`}
                disabled={isLoading}
              >
                {isLoading && <LoadingSpinner size="sm" />}
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-page-fade-in px-0 py-5 text-center">
            <img src={logo} alt="3DAI" className="mx-auto mb-4 h-14 w-auto object-contain" />
            <h2 className="mb-2.5 text-[1.8rem] font-semibold">Check your email</h2>
            <p className="mb-8 text-[0.95rem] text-zinc-500">
              If an account exists for <br />
              <span className="font-medium text-indigo-400">{email}</span>, we sent a reset link.
            </p>
            <button
              type="button"
              className={`${authPrimaryButtonClass} w-full`}
              onClick={onBackToLogin}
            >
              Return to Login
            </button>
          </div>
        )}
      </AuthCard>
    </AuthPageShell>
  );
};

export default ResetPassword;
