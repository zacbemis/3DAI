import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import {
  AuthCard,
  AuthPageShell,
  authFieldInputClass,
  authFieldLabelClass,
  authPrimaryButtonClass,
} from '../../components/auth/auth-layout';

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email (e.g., name@domain.com)');
      return;
    }

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
            <div className="mb-8">
              <h2 className="mb-3 text-[1.8rem] font-semibold leading-tight">Reset Password</h2>
              <p className="text-[0.9rem] leading-relaxed text-zinc-500">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {errorMessage && (
                <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-left text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

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
                className={`${authPrimaryButtonClass} w-full`}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-page-fade-in px-0 py-5 text-center">
            <div className="mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#4a90e2]/30 bg-[#4a90e2]/15 text-2xl text-[#4a90e2]">
              <span>✓</span>
            </div>
            <h2 className="mb-2.5 text-[1.8rem] font-semibold">Check your email</h2>
            <p className="mb-8 text-[0.95rem] text-zinc-500">
              If an account exists for <br />
              <span className="font-medium text-[#4a90e2]">{email}</span>, we sent a reset link.
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
