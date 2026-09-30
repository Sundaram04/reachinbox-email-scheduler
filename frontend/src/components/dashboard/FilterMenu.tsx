"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, FilterIcon } from "@/components/icons/icons";
import { SCOPE_STATUSES } from "@/lib/emails";
import { cn } from "@/lib/cn";
import type { EmailScope, EmailStatus } from "@/types/api";

const LABELS: Record<EmailStatus, string> = {
  scheduled: "Scheduled",
  processing: "Processing",
  sent: "Sent",
  failed: "Failed",
};

type FilterMenuProps = {
  scope: EmailScope;
  value: EmailStatus | null;
  onChange: (status: EmailStatus | null) => void;
};

export function FilterMenu({ scope, value, onChange }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(status: EmailStatus | null) {
    onChange(status);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Filter"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-field",
          value ? "bg-brand-soft text-brand" : "text-muted hover:text-ink",
        )}
      >
        <FilterIcon className="size-4" />
        {value && (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-card border border-line bg-white p-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-[0.625rem] font-medium uppercase tracking-wider text-muted">
            Status
          </p>
          {SCOPE_STATUSES[scope].map((status) => (
            <button
              key={status}
              type="button"
              role="menuitemradio"
              aria-checked={value === status}
              onClick={() => select(value === status ? null : status)}
              className="flex h-9 w-full items-center justify-between rounded-field px-3 text-row text-ink hover:bg-field"
            >
              {LABELS[status]}
              {value === status && <CheckIcon className="size-4 text-brand" />}
            </button>
          ))}
          {value && (
            <button
              type="button"
              role="menuitem"
              onClick={() => select(null)}
              className="mt-1 flex h-9 w-full items-center rounded-field border-t border-line px-3 text-row text-muted hover:bg-field"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
