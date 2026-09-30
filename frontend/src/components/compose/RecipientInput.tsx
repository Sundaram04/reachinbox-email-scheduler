"use client";

import {
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { UploadIcon, XIcon } from "@/components/icons/icons";
import {
  MAX_UPLOAD_BYTES,
  extractEmails,
  mergeRecipients,
} from "@/lib/recipients";

const COLLAPSED_CHIPS = 4;

type RecipientInputProps = {
  recipients: string[];
  onChange: (recipients: string[]) => void;
  error?: string;
};

export function RecipientInput({
  recipients,
  onChange,
  error,
}: RecipientInputProps) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = expanded ? recipients : recipients.slice(0, COLLAPSED_CHIPS);
  const hidden = recipients.length - visible.length;

  function addFromText(raw: string) {
    const { valid, invalid } = extractEmails(raw);

    if (valid.length > 0) {
      const merged = mergeRecipients(recipients, valid);
      onChange(merged.list);
      setNotice(
        merged.duplicates > 0
          ? `${merged.duplicates} duplicate${merged.duplicates === 1 ? "" : "s"} skipped`
          : null,
      );
    }

    if (invalid.length > 0) {
      setInputError(
        `${invalid[0]} is not a valid email address${
          invalid.length > 1 ? ` (+${invalid.length - 1} more)` : ""
        }`,
      );
      setText(invalid.join(", "));
      return false;
    }

    if (valid.length === 0 && raw.trim()) {
      setInputError(`${raw.trim()} is not a valid email address`);
      return false;
    }

    setInputError(null);
    setText("");
    return true;
  }

  function commit() {
    if (text.trim()) {
      addFromText(text);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "Enter" ||
      event.key === "," ||
      event.key === ";" ||
      event.key === " " ||
      event.key === "Tab"
    ) {
      if (text.trim()) {
        event.preventDefault();
        addFromText(text);
      } else if (event.key === "Enter") {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Backspace" && !text && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");

    if (/[\s,;]/.test(pasted.trim())) {
      event.preventDefault();
      addFromText(pasted);
    }
  }

  function remove(email: string) {
    onChange(recipients.filter((item) => item !== email));
    setNotice(null);
    setInputError(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setInputError(null);

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setInputError("Upload a .csv or .txt file.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setInputError("That file is too large (5 MB max).");
      return;
    }

    const content = await file.text();
    const { valid, invalid } = extractEmails(content);

    if (valid.length === 0) {
      setInputError(
        invalid.length > 0
          ? `No valid email addresses found (${invalid.length} invalid).`
          : "No email addresses found in that file.",
      );
      return;
    }

    const merged = mergeRecipients(recipients, valid);
    onChange(merged.list);
    setInputError(null);

    const parts = [
      `${merged.added.toLocaleString("en-US")} recipient${merged.added === 1 ? "" : "s"} added from ${file.name}`,
    ];

    if (merged.duplicates > 0) {
      parts.push(
        `${merged.duplicates.toLocaleString("en-US")} duplicate${merged.duplicates === 1 ? "" : "s"} skipped`,
      );
    }

    if (invalid.length > 0) {
      parts.push(`${invalid.length.toLocaleString("en-US")} invalid ignored`);
    }

    setNotice(parts.join(" · "));
  }

  const message = inputError ?? error;

  return (
    <div>
      <div className="flex items-start gap-3 border-b border-line pb-2 focus-within:border-brand">
        <div
          className={
            expanded
              ? "flex max-h-40 min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-y-auto"
              : "flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
          }
        >
          {visible.map((email) => (
            <span
              key={email}
              className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-brand bg-brand-soft/60 pl-2.5 pr-1 text-xxs text-ink"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => remove(email)}
                className="flex size-4 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-ink"
              >
                <XIcon className="size-2.5" />
              </button>
            </span>
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-6 items-center rounded-full border border-brand bg-brand-soft px-2.5 text-xxs font-medium text-ink"
            >
              +{hidden.toLocaleString("en-US")}
            </button>
          )}
          {expanded && recipients.length > COLLAPSED_CHIPS && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex h-6 items-center rounded-full border border-line px-2.5 text-xxs text-muted hover:bg-field"
            >
              Show less
            </button>
          )}

          <input
            type="text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setInputError(null);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={commit}
            placeholder={recipients.length === 0 ? "recipient@example.com" : ""}
            aria-label="To"
            aria-invalid={Boolean(message)}
            className="h-6 min-w-40 flex-1 bg-transparent text-row text-ink outline-none placeholder:text-muted"
          />
        </div>

        <span className="flex shrink-0 items-center gap-3">
          {recipients.length > 0 && (
            <span className="text-xxs text-muted" aria-live="polite">
              {recipients.length.toLocaleString("en-US")} recipient
              {recipients.length === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xxs font-medium text-brand hover:underline"
          >
            <UploadIcon className="size-3.5" />
            Upload List
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            aria-label="Upload recipient list"
            data-testid="recipient-file"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </span>
      </div>

      {message && (
        <p role="alert" className="mt-1.5 text-xxs text-danger">
          {message}
        </p>
      )}
      {!message && notice && (
        <p role="status" className="mt-1.5 text-xxs text-muted">
          {notice}
        </p>
      )}
    </div>
  );
}
