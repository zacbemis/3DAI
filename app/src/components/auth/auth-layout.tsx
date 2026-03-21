import type { ReactNode } from 'react';

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-fade-in relative flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top_right,#1a1a2e,#0a0a0c)] p-5 text-white">
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
      className={`w-full ${max} rounded-[20px] border border-white/10 bg-white/[0.03] p-10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-[10px]`}
    >
      {children}
    </div>
  );
}

export const authFieldLabelClass = 'text-[0.85rem] text-zinc-300';

export const authFieldInputClass =
  'w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#4a90e2] disabled:opacity-60';

export const authPrimaryButtonClass =
  'rounded-lg border-0 bg-[#4a90e2] px-3.5 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#357abd] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0';

export const authLinkClass =
  'cursor-pointer font-medium text-[#4a90e2] hover:underline';
