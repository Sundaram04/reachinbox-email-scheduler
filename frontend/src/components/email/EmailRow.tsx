import Link from "next/link";

import { formatShortDate } from "@/lib/format";
import type { EmailRowData } from "@/types/api";

import { StatusBadge } from "./StatusBadge";

export function EmailRow({ email }: { email: EmailRowData }) {
  const trailing =
    email.status === "sent" && email.sentAt
      ? formatShortDate(email.sentAt)
      : email.status === "failed"
        ? formatShortDate(email.scheduledAt)
        : null;

  return (
    <li className="border-b border-line">
      <Link
        href={`/emails/${email.id}`}
        className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-field/60 sm:grid sm:grid-cols-[11rem_9.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:px-6 md:grid-cols-[14rem_9.5rem_minmax(0,1fr)_auto] lg:grid-cols-[16rem_9.5rem_minmax(0,1fr)_auto]"
      >
        <span
          title={email.toEmail}
          className="truncate text-row font-medium text-ink"
        >
          To: {email.toEmail}
        </span>
        <span className="flex">
          <StatusBadge status={email.status} scheduledAt={email.scheduledAt} />
        </span>
        <span
          title={email.subject}
          className="truncate text-row font-semibold text-ink"
        >
          {email.subject}
        </span>
        <span className="hidden text-xxs text-muted sm:block">{trailing}</span>
      </Link>
    </li>
  );
}
