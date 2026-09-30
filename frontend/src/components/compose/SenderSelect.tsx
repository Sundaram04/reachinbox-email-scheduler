"use client";

import { ChevronDownIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/Button";
import type { Sender } from "@/types/api";

const ADD_VALUE = "__add__";

type SenderSelectProps = {
  senders: Sender[];
  loading: boolean;
  loadError: string | null;
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
  onRetry: () => void;
};

export function SenderSelect({
  senders,
  loading,
  loadError,
  value,
  onChange,
  onAdd,
  onRetry,
}: SenderSelectProps) {
  if (loading) {
    return <span className="h-8 w-56 animate-pulse rounded-field bg-chip" />;
  }

  if (loadError) {
    return (
      <span className="flex items-center gap-3 text-row text-danger">
        {loadError}
        <button
          type="button"
          onClick={onRetry}
          className="text-brand hover:underline"
        >
          Retry
        </button>
      </span>
    );
  }

  if (senders.length === 0) {
    return (
      <span className="flex flex-wrap items-center gap-3">
        <span className="text-row text-muted">No sender configured yet.</span>
        <Button variant="outline" className="h-8 px-3 text-xxs" onClick={onAdd}>
          Add sender
        </Button>
      </span>
    );
  }

  return (
    <span className="relative inline-flex max-w-full items-center">
      <select
        aria-label="From"
        value={value}
        onChange={(event) =>
          event.target.value === ADD_VALUE
            ? onAdd()
            : onChange(event.target.value)
        }
        className="h-8 max-w-full appearance-none truncate rounded-field bg-field py-0 pl-3 pr-8 text-row text-ink outline-none focus:outline-2 focus:outline-solid focus:outline-brand"
      >
        {senders.map((sender) => (
          <option key={sender.id} value={sender.id}>
            {sender.fromEmail}
          </option>
        ))}
        <option value={ADD_VALUE}>+ Add sender…</option>
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 size-3.5 text-muted" />
    </span>
  );
}
