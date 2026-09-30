import { ClockIcon } from "@/components/icons/icons";
import { cn } from "@/lib/cn";
import { formatScheduledTime } from "@/lib/format";
import type { EmailStatus } from "@/types/api";

type StatusBadgeProps = {
  status: EmailStatus;
  scheduledAt: string;
  className?: string;
};

const base =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xxs font-medium whitespace-nowrap";

export function StatusBadge({
  status,
  scheduledAt,
  className,
}: StatusBadgeProps) {
  if (status === "scheduled") {
    return (
      <span
        className={cn(
          base,
          "border border-scheduled-line bg-scheduled-bg text-scheduled-text",
          className,
        )}
      >
        <ClockIcon className="size-3" />
        {formatScheduledTime(scheduledAt)}
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span
        className={cn(
          base,
          "border border-scheduled-line bg-scheduled-bg text-scheduled-text",
          className,
        )}
      >
        <ClockIcon className="size-3 animate-pulse" />
        Processing
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className={cn(base, "bg-danger/10 text-danger", className)}>
        Failed
      </span>
    );
  }

  return (
    <span className={cn(base, "bg-chip text-ink/80", className)}>Sent</span>
  );
}
