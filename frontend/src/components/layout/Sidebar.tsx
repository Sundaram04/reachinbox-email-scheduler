"use client";

import Link from "next/link";

import { CountBadge } from "@/components/dashboard/CountBadge";
import { ClockIcon, SendIcon } from "@/components/icons/icons";
import { NavItem } from "@/components/navigation/NavItem";
import { useMailCounts } from "@/hooks/useMailCounts";

import { UserMenu } from "./UserMenu";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const counts = useMailCounts();

  return (
    <div className="flex h-full flex-col gap-3 px-3 py-4">
      <Link
        href="/scheduled"
        onClick={onNavigate}
        className="px-1 pb-1 text-xl font-bold tracking-tight text-ink"
      >
        ReachInbox
      </Link>

      <UserMenu />

      <Link
        href="/compose"
        onClick={onNavigate}
        className="flex h-9 items-center justify-center rounded-full border border-brand text-row font-medium text-brand transition-colors hover:bg-brand-soft"
      >
        Compose
      </Link>

      <nav aria-label="Mailbox" className="mt-2 flex flex-col gap-1">
        <p className="px-3 pb-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted">
          Core
        </p>
        <NavItem
          href="/scheduled"
          label="Scheduled"
          icon={<ClockIcon />}
          trailing={<CountBadge value={counts.scheduled} />}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/sent"
          label="Sent"
          icon={<SendIcon />}
          trailing={<CountBadge value={counts.sent} />}
          onNavigate={onNavigate}
        />
      </nav>
    </div>
  );
}
