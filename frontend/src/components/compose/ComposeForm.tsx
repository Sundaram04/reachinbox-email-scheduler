"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { ArrowLeftIcon, ClockIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useMailCounts } from "@/hooks/useMailCounts";
import { useSenders } from "@/hooks/useSenders";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { MAX_RECIPIENTS } from "@/lib/recipients";
import { scheduleEmails } from "@/lib/emails";

import { AddSenderDialog } from "./AddSenderDialog";
import { RecipientInput } from "./RecipientInput";
import { SendLaterPopover } from "./SendLaterPopover";
import { SenderSelect } from "./SenderSelect";

type FieldName =
  | "sender"
  | "recipients"
  | "subject"
  | "body"
  | "delay"
  | "hourlyLimit"
  | "startTime";

type Errors = Partial<Record<FieldName, string>>;

const MAX_SPAN_SECONDS = 30 * 24 * 60 * 60;

function Row({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-2">
        <span className="pt-1 text-row text-ink">{label}</span>
        <div className="min-w-0">{children}</div>
      </div>
      {error && (
        <p role="alert" className="ml-[5rem] mt-1.5 text-xxs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const numberInput =
  "h-8 w-16 rounded-field border border-line bg-white px-2 text-center text-row text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-danger";

export function ComposeForm() {
  const router = useRouter();
  const toast = useToast();
  const counts = useMailCounts();
  const {
    senders,
    loading,
    error: senderError,
    reload,
    addSender,
  } = useSenders();

  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delay, setDelay] = useState("0");
  const [hourlyLimit, setHourlyLimit] = useState("100");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [addingSender, setAddingSender] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const senderId =
    selectedSender && senders.some((sender) => sender.id === selectedSender)
      ? selectedSender
      : (senders[0]?.id ?? "");

  const dirty =
    recipients.length > 0 || subject.trim() !== "" || body.trim() !== "";

  useEffect(() => {
    if (!dirty || submitting) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitting]);

  function clearError(field: FieldName) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function goBack() {
    if (
      dirty &&
      !window.confirm("Discard this email? Your changes will be lost.")
    ) {
      return;
    }

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/scheduled");
    }
  }

  function validate(): Errors {
    const found: Errors = {};

    if (!senderId) {
      found.sender = "Select or add a sender to send from.";
    }

    if (recipients.length === 0) {
      found.recipients = "Add at least one recipient.";
    } else if (recipients.length > MAX_RECIPIENTS) {
      found.recipients = `You can send to at most ${MAX_RECIPIENTS.toLocaleString("en-US")} recipients at once.`;
    }

    if (!subject.trim()) {
      found.subject = "Subject is required.";
    } else if (subject.trim().length > 998) {
      found.subject = "Subject is too long (998 characters max).";
    }

    if (!body.trim()) {
      found.body = "Write a message before sending.";
    } else if (body.length > 200_000) {
      found.body = "Message is too long (200,000 characters max).";
    }

    const delaySeconds = Number(delay);

    if (!/^\d+$/.test(delay.trim()) || delaySeconds > 3600) {
      found.delay = "Delay must be a whole number of seconds from 0 to 3600.";
    } else if ((recipients.length - 1) * delaySeconds > MAX_SPAN_SECONDS) {
      found.delay =
        "With this many recipients the schedule would run longer than 30 days. Lower the delay.";
    }

    const limit = Number(hourlyLimit);

    if (!/^\d+$/.test(hourlyLimit.trim()) || limit < 1 || limit > 10_000) {
      found.hourlyLimit =
        "Hourly limit must be a whole number from 1 to 10,000.";
    }

    if (startTime && startTime.getTime() < Date.now() - 30_000) {
      found.startTime = "The selected time has passed. Pick a new time.";
    }

    return found;
  }

  function applyServerErrors(err: ApiError) {
    const mapped: Errors = {};

    for (const detail of err.details ?? []) {
      const root = detail.path.split(".")[0];
      const message = detail.message;

      if (root === "recipients") {
        mapped.recipients = `Some recipients were rejected: ${message}`;
      } else if (root === "subject") {
        mapped.subject = message;
      } else if (root === "body") {
        mapped.body = message;
      } else if (root === "delaySeconds") {
        mapped.delay = message;
      } else if (root === "hourlyLimit") {
        mapped.hourlyLimit = message;
      } else if (root === "startTime") {
        mapped.startTime = message;
      } else if (root === "senderIds") {
        mapped.sender = message;
      }
    }

    if (
      err.message === "Invalid sender" ||
      err.message === "No senders configured"
    ) {
      mapped.sender = err.message;
    }

    setErrors(mapped);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const found = validate();
    setErrors(found);
    setFormError(null);

    if (Object.keys(found).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await scheduleEmails({
        subject: subject.trim(),
        body,
        recipients,
        startTime: (startTime ?? new Date()).toISOString(),
        delaySeconds: Number(delay),
        hourlyLimit: Number(hourlyLimit),
        senderIds: [senderId],
      });

      const skipped =
        result.duplicatesRemoved > 0
          ? ` (${result.duplicatesRemoved} duplicate${result.duplicatesRemoved === 1 ? "" : "s"} removed)`
          : "";

      toast.success(
        `Scheduled ${result.scheduledCount.toLocaleString("en-US")} email${result.scheduledCount === 1 ? "" : "s"}${skipped}`,
      );
      void counts.refresh();
      router.push("/scheduled");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";

      if (err instanceof ApiError) {
        applyServerErrors(err);
      }

      setFormError(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const later = startTime !== null;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="min-h-screen bg-white"
      >
        <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            aria-label="Back"
            onClick={goBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-field"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-normal text-ink sm:text-xl">
            Compose New Email
          </h1>

          <div className="relative flex shrink-0 items-center gap-2">
            {later && (
              <span className="hidden text-xxs text-muted sm:inline">
                {formatDateTime(startTime.toISOString())}
              </span>
            )}
            <button
              type="button"
              aria-label="Send later"
              aria-expanded={popoverOpen}
              onClick={() => setPopoverOpen((open) => !open)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors hover:bg-brand-soft",
                later ? "text-brand" : "text-muted",
              )}
            >
              <ClockIcon className="size-4" />
            </button>
            <Button
              type="submit"
              variant="outline"
              className="h-8 px-4 text-xxs"
              disabled={submitting}
            >
              {submitting && <Spinner className="size-3.5" />}
              {later ? "Send Later" : "Send"}
            </Button>

            {popoverOpen && (
              <SendLaterPopover
                value={startTime}
                onClose={() => setPopoverOpen(false)}
                onApply={(value) => {
                  setStartTime(value);
                  clearError("startTime");
                  setPopoverOpen(false);
                }}
              />
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[62rem] px-4 pb-16 pt-4 sm:px-6">
          {formError && (
            <p
              role="alert"
              className="mb-3 rounded-field bg-danger/10 px-3 py-2 text-row text-danger"
            >
              {formError}
            </p>
          )}

          <Row label="From" error={errors.sender}>
            <SenderSelect
              senders={senders}
              loading={loading}
              loadError={senderError}
              value={senderId}
              onChange={(id) => {
                setSelectedSender(id);
                clearError("sender");
              }}
              onAdd={() => setAddingSender(true)}
              onRetry={reload}
            />
          </Row>

          <Row label="To">
            <RecipientInput
              recipients={recipients}
              onChange={(next) => {
                setRecipients(next);
                clearError("recipients");
              }}
              error={errors.recipients}
            />
          </Row>

          <Row label="Subject" error={errors.subject}>
            <input
              type="text"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                clearError("subject");
              }}
              placeholder="Subject"
              aria-label="Subject"
              aria-invalid={Boolean(errors.subject)}
              className="h-8 w-full border-b border-line bg-transparent pb-1 text-row text-ink outline-none placeholder:text-muted focus:border-brand"
            />
          </Row>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-3">
            <label className="flex items-center gap-3 text-row text-ink">
              Delay between 2 emails
              <input
                type="text"
                inputMode="numeric"
                value={delay}
                onChange={(event) => {
                  setDelay(event.target.value);
                  clearError("delay");
                }}
                placeholder="00"
                aria-label="Delay between 2 emails in seconds"
                aria-invalid={Boolean(errors.delay)}
                className={numberInput}
              />
              <span className="-ml-1 text-xxs text-muted">sec</span>
            </label>
            <label className="flex items-center gap-3 text-row text-ink">
              Hourly Limit
              <input
                type="text"
                inputMode="numeric"
                value={hourlyLimit}
                onChange={(event) => {
                  setHourlyLimit(event.target.value);
                  clearError("hourlyLimit");
                }}
                placeholder="00"
                aria-label="Hourly limit"
                aria-invalid={Boolean(errors.hourlyLimit)}
                className={numberInput}
              />
            </label>
          </div>
          {(errors.delay || errors.hourlyLimit || errors.startTime) && (
            <div
              role="alert"
              className="-mt-1 mb-2 space-y-1 text-xxs text-danger"
            >
              {errors.delay && <p>{errors.delay}</p>}
              {errors.hourlyLimit && <p>{errors.hourlyLimit}</p>}
              {errors.startTime && <p>{errors.startTime}</p>}
            </div>
          )}

          <div className="mt-2">
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                clearError("body");
              }}
              placeholder="Type your message…"
              aria-label="Message"
              aria-invalid={Boolean(errors.body)}
              className="min-h-80 w-full resize-y rounded-card bg-field p-5 text-row leading-6 text-ink outline-none placeholder:text-muted focus:outline-2 focus:outline-solid focus:outline-brand aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger"
            />
            {errors.body && (
              <p role="alert" className="mt-1.5 text-xxs text-danger">
                {errors.body}
              </p>
            )}
          </div>
        </main>
      </form>
      {addingSender && (
        <AddSenderDialog
          onClose={() => setAddingSender(false)}
          onCreated={(sender) => {
            addSender(sender);
            setSelectedSender(sender.id);
            clearError("sender");
            setAddingSender(false);
            toast.success(`Sender ${sender.fromEmail} added`);
          }}
        />
      )}
    </>
  );
}
