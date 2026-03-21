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

const UpdatePassword = ({ onComplete }: { onComplete: () => void }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      setError(updateErr.message);
    } else {
      onComplete();
    }
    setLoading(false);
  };

  return (
    <AuthPageShell>
      <AuthCard>
        <div className="mb-8">
          <h2 className="mb-2 text-[1.8rem] font-semibold leading-tight">
            Create New Password
          </h2>
          <p className="text-[0.9rem] text-zinc-500">
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="flex flex-col gap-5">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <div className="flex flex-col gap-2">
            <label className={authFieldLabelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={authFieldInputClass}
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={authFieldLabelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authFieldInputClass}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className={`${authPrimaryButtonClass} mt-2.5 flex w-full items-center justify-center gap-2`}
            disabled={loading}
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </AuthCard>
    </AuthPageShell>
  );
};

export default UpdatePassword;
