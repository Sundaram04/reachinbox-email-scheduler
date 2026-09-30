"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowLeftIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { ApiError } from "@/lib/api";
import { fetchEmailDetail, fetchSenders } from "@/lib/emails";
import { formatDateTime } from "@/lib/format";
import type { EmailDetail as EmailDetailData } from "@/types/api";

import { StatusBadge } from "./StatusBadge";

type Result =
  | {
      id: string;
      kind: "ready";
      email: EmailDetailData;
      fromEmail: string | null;
    }
  | { id: string; kind: "not-found" }
  | { id: string; kind: "error"; message: string };

export function EmailDetail({ id }: { id: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmailDetail(id, controller.signal)
      .then(async (email) => {
        let fromEmail: string | null = null;

        if (email.senderId) {
          const senders = await fetchSenders(controller.signal).catch(() => []);
          fromEmail =
            senders.find((sender) => sender.id === email.senderId)?.fromEmail ??
            null;
        }

        if (!controller.signal.aborted) {
          setResult({ id, kind: "ready", email, fromEmail });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          err instanceof ApiError &&
          (err.status === 404 || err.status === 400)
        ) {
          setResult({ id, kind: "not-found" });
          return;
        }

        setResult({
          id,
          kind: "error",
          message:
            err instanceof ApiError
              ? err.message
              : "Something went wrong. Please try again.",
        });
      });

    return () => controller.abort();
  }, [id, attempt]);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/scheduled");
    }
  }

  const current = result && result.id === id ? result : null;
  const subject =
    current?.kind === "ready"
      ? current.email.subject
      : current?.kind === "not-found"
        ? "Email not found"
        : "";

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-field"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1
          title={subject}
          className="line-clamp-2 min-w-0 flex-1 break-words text-lg font-medium text-ink"
        >
          {subject || (current ? "" : "Loading…")}
        </h1>
      </header>
      <main>
        {!current && (
          <div
            aria-busy="true"
            className="mx-auto flex max-w-3xl animate-pulse flex-col gap-4 px-4 py-10 sm:px-6"
          >
            <span className="h-4 w-56 rounded bg-chip" />
            <span className="h-3 w-40 rounded bg-chip" />
            <span className="mt-6 h-3 w-full rounded bg-chip" />
            <span className="h-3 w-5/6 rounded bg-chip" />
            <span className="h-3 w-2/3 rounded bg-chip" />
          </div>
        )}

        {current?.kind === "error" && (
          <ErrorState
            compact
            title="Couldn't load this email"
            message={current.message}
            onRetry={() => {
              setResult(null);
              setAttempt((count) => count + 1);
            }}
          />
        )}

        {current?.kind === "not-found" && (
          <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
            <p className="text-row text-muted">
              This email doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => router.push("/scheduled")}
            >
              Back to Scheduled
            </Button>
          </div>
        )}

        {current?.kind === "ready" && (
          <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white"
              >
                {(current.fromEmail ?? current.email.toEmail)
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="truncate text-row font-semibold text-ink">
                    {current.fromEmail
                      ? `From: ${current.fromEmail}`
                      : "From: —"}
                  </p>
                  <p className="text-xxs text-muted">
                    {formatDateTime(
                      current.email.status === "sent" && current.email.sentAt
                        ? current.email.sentAt
                        : current.email.scheduledAt,
                    )}
                  </p>
                </div>
                <p className="break-all text-xxs text-muted">
                  To: {current.email.toEmail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={current.email.status}
                    scheduledAt={current.email.scheduledAt}
                  />
                  {current.email.status !== "sent" && (
                    <span className="text-xxs text-muted">
                      Scheduled for {formatDateTime(current.email.scheduledAt)}
                    </span>
                  )}
                  {current.email.previewUrl && (
                    <a
                      href={current.email.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xxs font-medium text-brand hover:underline"
                    >
                      Open preview
                    </a>
                  )}
                </div>
              </div>
            </div>

            {current.email.status === "failed" && current.email.lastError && (
              <p
                role="alert"
                className="mt-6 rounded-field bg-danger/10 px-3 py-2 text-row text-danger"
              >
                {current.email.lastError}
              </p>
            )}

            <div className="mt-8 whitespace-pre-wrap break-words text-row leading-6 text-ink">
              {current.email.body}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
