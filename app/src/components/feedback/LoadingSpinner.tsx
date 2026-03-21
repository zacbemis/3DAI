interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[2.5px]',
} as const;

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-indigo-500/30 border-t-indigo-400 ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
