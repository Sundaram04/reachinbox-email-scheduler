import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { EmailScope } from "@/types/api";

type EmailEmptyStateProps = {
  scope: EmailScope;
  filtered: boolean;
  outOfRange?: boolean;
  onReset: () => void;
};

export function EmailEmptyState({
  scope,
  filtered,
  outOfRange,
  onReset,
}: EmailEmptyStateProps) {
  let title =
    scope === "scheduled" ? "No scheduled emails" : "No sent emails yet";
  let hint =
    scope === "scheduled"
      ? "Emails you schedule will show up here."
      : "Emails will appear here once they are sent.";

  if (filtered) {
    title = "No results found";
    hint = "Try a different search or clear the filter.";
  }

  if (outOfRange) {
    title = "This page is empty";
    hint = "The list changed while you were browsing.";
  }

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="text-row text-muted">{hint}</p>
      {(filtered || outOfRange) && (
        <Button variant="outline" className="mt-3" onClick={onReset}>
          {outOfRange ? "Go to first page" : "Clear search and filter"}
        </Button>
      )}
      {!filtered && !outOfRange && scope === "scheduled" && (
        <Link
          href="/compose"
          className="mt-3 inline-flex h-9 items-center rounded-full border border-brand px-4 text-row font-medium text-brand hover:bg-brand-soft"
        >
          Compose
        </Link>
      )}
    </div>
  );
}
