import type { CountValue } from "@/hooks/useMailCounts";

export function CountBadge({ value }: { value: CountValue }) {
  if (value === "loading") {
    return (
      <span
        aria-label="Loading count"
        className="h-3 w-5 animate-pulse rounded bg-chip"
      />
    );
  }

  if (value === "unavailable") {
    return (
      <span title="Count unavailable" className="text-xxs text-muted">
        –
      </span>
    );
  }

  return (
    <span className="text-xxs tabular-nums text-muted">
      {value.toLocaleString("en-US")}
    </span>
  );
}
