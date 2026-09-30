"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api";
import { createSender } from "@/lib/emails";
import { isValidEmail } from "@/lib/recipients";
import type { Sender } from "@/types/api";

type AddSenderDialogProps = {
  onClose: () => void;
  onCreated: (sender: Sender) => void;
};

type Fields = {
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
};

const EMPTY: Fields = {
  fromEmail: "",
  smtpHost: "smtp.ethereal.email",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
};

const input =
  "h-10 w-full rounded-field bg-field px-3 text-row text-ink outline-none placeholder:text-muted focus:outline-2 focus:outline-solid focus:outline-brand";

function validate(fields: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {};

  if (!isValidEmail(fields.fromEmail.trim().toLowerCase())) {
    errors.fromEmail = "Enter a valid email address.";
  }

  if (!fields.smtpHost.trim()) {
    errors.smtpHost = "SMTP host is required.";
  }

  const port = Number(fields.smtpPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.smtpPort = "Port must be between 1 and 65535.";
  }

  if (!fields.smtpUser.trim()) {
    errors.smtpUser = "SMTP username is required.";
  }

  if (!fields.smtpPass) {
    errors.smtpPass = "SMTP password is required.";
  }

  return errors;
}

export function AddSenderDialog({ onClose, onCreated }: AddSenderDialogProps) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  const [returnFocusTo] = useState(
    () => document.activeElement as HTMLElement | null,
  );
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        "input, button:not(:disabled)",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector("input")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const found = validate(fields);
    setErrors(found);
    setFormError(null);

    if (Object.keys(found).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const sender = await createSender({
        fromEmail: fields.fromEmail.trim().toLowerCase(),
        smtpHost: fields.smtpHost.trim(),
        smtpPort: Number(fields.smtpPort),
        smtpUser: fields.smtpUser.trim(),
        smtpPass: fields.smtpPass,
      });

      onCreated(sender);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (err.details?.[0]?.message ?? err.message)
          : "Couldn't add the sender. Please try again.",
      );
      setSubmitting(false);
    }
  }

  const rows: { key: keyof Fields; label: string; type?: string }[] = [
    { key: "fromEmail", label: "From email" },
    { key: "smtpHost", label: "SMTP host" },
    { key: "smtpPort", label: "SMTP port" },
    { key: "smtpUser", label: "SMTP username" },
    { key: "smtpPass", label: "SMTP password", type: "password" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sender-title"
        onSubmit={handleSubmit}
        noValidate
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-card bg-white p-6 shadow-xl"
      >
        <h2 id="add-sender-title" className="text-base font-semibold text-ink">
          Add sender
        </h2>
        <p className="mt-1 text-xxs text-muted">
          Emails are sent through this SMTP account. The password is stored
          encrypted and never shown again.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {rows.map((row) => (
            <label key={row.key} className="block">
              <span className="mb-1 block text-xxs font-medium text-ink">
                {row.label}
              </span>
              <input
                type={row.type ?? "text"}
                value={fields[row.key]}
                onChange={(event) => set(row.key, event.target.value)}
                autoComplete={row.type === "password" ? "new-password" : "off"}
                inputMode={row.key === "smtpPort" ? "numeric" : undefined}
                aria-invalid={Boolean(errors[row.key])}
                className={input}
              />
              {errors[row.key] && (
                <span role="alert" className="mt-1 block text-xxs text-danger">
                  {errors[row.key]}
                </span>
              )}
            </label>
          ))}
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-4 rounded-field bg-danger/10 px-3 py-2 text-xxs text-danger"
          >
            {formError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && (
              <Spinner className="size-4 border-white/50 border-t-white" />
            )}
            Add sender
          </Button>
        </div>
      </form>
    </div>
  );
}
