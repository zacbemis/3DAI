import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { AuthCard, AuthPageShell } from '../../components/auth/auth-layout';

const updateFieldLabelClass =
  'text-[0.75rem] font-semibold uppercase tracking-wide text-white/50';

const updateInputClass =
  'w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#646cff] focus:bg-white/[0.08] focus:shadow-[0_0_10px_rgba(100,108,255,0.2)]';

const updateSubmitClass =
  'mt-2.5 w-full rounded-[10px] border-0 bg-gradient-to-br from-[#646cff] to-[#9089ff] px-3.5 py-3.5 text-base font-semibold text-white shadow-[0_10px_20px_rgba(100,108,255,0.2)] transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_15px_25px_rgba(100,108,255,0.4)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

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
      alert('Password updated successfully!');
      onComplete();
    }
    setLoading(false);
  };

  return (
    <AuthPageShell>
      <AuthCard>
        <h2 className="mb-2.5 text-center text-3xl font-bold text-white">Create New Password</h2>
        <p className="mb-8 text-center text-[0.95rem] text-white/60">
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleUpdate} className="flex flex-col gap-5 text-left">
          {error && (
            <div className="mb-1 rounded-lg border-l-4 border-red-500 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className={updateFieldLabelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={updateInputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={updateFieldLabelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={updateInputClass}
              required
            />
          </div>
          <button type="submit" className={updateSubmitClass} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </AuthCard>
    </AuthPageShell>
  );
};

export default UpdatePassword;
