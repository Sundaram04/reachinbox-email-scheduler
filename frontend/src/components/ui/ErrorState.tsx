import { cn } from "@/lib/cn";

import { Button } from "./Button";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({
  title,
  message,
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        compact ? "py-24" : "min-h-screen",
      )}
    >
      {compact ? (
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      ) : (
        <h1 className="text-base font-semibold text-ink">{title}</h1>
      )}
      <p className="max-w-sm text-row text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
