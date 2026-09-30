"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { useDebounced } from "@/hooks/useDebounced";
import { useEmailQuery } from "@/hooks/useEmailQuery";
import { useEmails } from "@/hooks/useEmails";
import { cn } from "@/lib/cn";

import { EmailEmptyState } from "./EmailEmptyState";
import { EmailListSkeleton } from "./EmailListSkeleton";
import { EmailRow } from "./EmailRow";
import { Pagination } from "./Pagination";

const SEARCH_DEBOUNCE_MS = 350;

export function EmailList() {
  const {
    scope,
    query,
    setText,
    setStatus,
    setPage,
    reloadKey,
    finishRefresh,
  } = useEmailQuery();

  const q = useDebounced(query.text.trim(), SEARCH_DEBOUNCE_MS);
  const { data, loading, error, retry } = useEmails({
    scope,
    q,
    status: query.status,
    page: query.page,
    reloadKey,
    onSettled: finishRefresh,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [query.page]);

  function resetFilters() {
    setText("");
    setStatus(null);
    setPage(0);
  }

  if (error) {
    return (
      <ErrorState
        compact
        title="Couldn't load emails"
        message={error}
        onRetry={retry}
      />
    );
  }

  if (!data) {
    return <EmailListSkeleton />;
  }

  const filtered = Boolean(query.text.trim() || query.status);

  if (data.items.length === 0) {
    return (
      <EmailEmptyState
        scope={scope}
        filtered={filtered && data.total === 0}
        outOfRange={data.total > 0}
        onReset={data.total > 0 ? () => setPage(0) : resetFilters}
      />
    );
  }

  return (
    <div className="border-t border-line">
      <ul className={cn("transition-opacity", loading && "opacity-50")}>
        {data.items.map((email) => (
          <EmailRow key={email.id} email={email} />
        ))}
      </ul>
      <Pagination
        total={data.total}
        limit={data.limit}
        offset={data.offset}
        disabled={loading}
        onPageChange={setPage}
      />
    </div>
  );
}
