import { LoadingSpinner } from './LoadingSpinner';
import logo from '../../assets/logo_transparent.png';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
      <img src={logo} alt="3DAI" className="h-16 w-auto object-contain" />
      <LoadingSpinner size="lg" />
      <span className="text-xs text-zinc-600">{message}</span>
    </div>
  );
}
