import { LoadingSpinner } from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
      <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
        3DAI
      </span>
      <LoadingSpinner size="lg" />
      <span className="text-xs text-zinc-600">{message}</span>
    </div>
  );
}
