interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-[#0a0a0c] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-2xl text-red-400">
        !
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-500">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
