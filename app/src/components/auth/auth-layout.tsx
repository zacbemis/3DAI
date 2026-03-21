import type { ReactNode } from 'react';

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-fade-in relative flex min-h-screen w-full items-center justify-center bg-[#0a0a0c] p-5 text-white">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(139,92,246,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(34,211,238,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 [mask-image:radial-gradient(ellipse_85%_65%_at_50%_45%,black,transparent)]"
        aria-hidden
      />
      {children}
    </div>
  );
}

type AuthCardProps = {
  children: ReactNode;
  variant?: 'narrow' | 'wide';
};

export function AuthCard({ children, variant = 'narrow' }: AuthCardProps) {
  const max = variant === 'wide' ? 'max-w-[460px]' : 'max-w-[400px]';
  return (
    <div
      className={`relative z-10 w-full ${max} rounded-2xl border border-white/10 bg-white/[0.03] p-10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-lg`}
    >
      {children}
    </div>
  );
}

export const authFieldLabelClass =
  'text-[0.85rem] font-medium text-zinc-400';

export const authFieldInputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-60';

export const authPrimaryButtonClass =
  'cursor-pointer rounded-lg border-0 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 px-4 py-3.5 font-semibold text-white shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(99,102,241,0.4)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';

export const authLinkClass =
  'cursor-pointer font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline';
