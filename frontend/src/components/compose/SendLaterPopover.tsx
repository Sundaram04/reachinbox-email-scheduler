"use client";

import { useEffect, useRef, useState } from "react";

import { CalendarIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/Button";

type SendLaterPopoverProps = {
  value: Date | null;
  onApply: (value: Date | null) => void;
  onClose: () => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);

  return date;
}

function tomorrowAt(hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);

  return date;
}

const QUICK_OPTIONS = [
  { label: "Tomorrow", hour: 9 },
  { label: "Tomorrow, 10:00 AM", hour: 10 },
  { label: "Tomorrow, 11:00 AM", hour: 11 },
  { label: "Tomorrow, 3:00 PM", hour: 15 },
];

export function SendLaterPopover({
  value,
  onApply,
  onClose,
}: SendLaterPopoverProps) {
  const [draft, setDraft] = useState(toLocalInput(value ?? defaultTime()));
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [minValue] = useState(() => toLocalInput(new Date()));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function done() {
    const parsed = draft ? new Date(draft) : null;

    if (!parsed || Number.isNaN(parsed.getTime())) {
      setError("Pick a date and time.");
      return;
    }

    if (parsed.getTime() <= Date.now()) {
      setError("Choose a time in the future.");
      return;
    }

    onApply(parsed);
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Send later"
      className="absolute right-0 top-full z-30 mt-2 w-72 rounded-card border border-line bg-white p-4 shadow-lg"
    >
      <h2 className="text-row font-semibold text-ink">Send Later</h2>

      <label className="mt-3 flex items-center gap-2 border-b border-line pb-2 text-muted focus-within:border-brand">
        <input
          type="datetime-local"
          value={draft}
          min={minValue}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          aria-label="Pick date and time"
          className="min-w-0 flex-1 bg-transparent text-row text-ink outline-none"
        />
        <CalendarIcon className="size-4 shrink-0" />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-xxs text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 flex flex-col">
        {QUICK_OPTIONS.map((option) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => {
                setDraft(toLocalInput(tomorrowAt(option.hour)));
                setError(null);
              }}
              className="w-full rounded-field px-1 py-1.5 text-left text-row text-ink hover:bg-field"
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-end gap-3">
        {value && (
          <button
            type="button"
            onClick={() => onApply(null)}
            className="mr-auto text-xxs text-muted hover:text-ink"
          >
            Send now instead
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-row text-ink hover:underline"
        >
          Cancel
        </button>
        <Button variant="outline" className="h-8 px-4" onClick={done}>
          Done
        </Button>
      </div>
    </div>
  );
}
