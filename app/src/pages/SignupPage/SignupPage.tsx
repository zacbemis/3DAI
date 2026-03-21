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
    <AuthPageShell>
      <AuthCard variant="wide">
        <div className="mb-8">
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
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldInputClass}
              required
              minLength={6}
            />
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
};

export default SignupPage;
