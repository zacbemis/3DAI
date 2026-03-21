interface ErrorBannerProps {
  message: string | null | undefined;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, className = '', onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm leading-snug text-red-300 ${className}`}
      role="alert"
    >
      <span className="mt-px shrink-0 text-red-400" aria-hidden>
        ⚠
      </span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="shrink-0 text-red-400/60 transition-colors hover:text-red-300"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
}
