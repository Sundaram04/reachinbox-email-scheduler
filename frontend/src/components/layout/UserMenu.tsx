"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ChevronDownIcon, LogoutIcon } from "@/components/icons/icons";
import { SlackIcon } from "@/components/icons/SlackIcon";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import type { User } from "@/types/api";

function Avatar({ user }: { user: User }) {
  const label = (user.name ?? user.email).trim();

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, size is fixed
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-row font-semibold text-brand"
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export function UserMenu() {
  const { state, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  if (state.status !== "authenticated") {
    return null;
  }

  const { user } = state;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-field px-2.5 py-2 text-left transition-colors hover:bg-chip"
      >
        <Avatar user={user} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-row font-medium leading-4 text-ink">
            {user.name ?? user.email}
          </span>
          <span className="block truncate text-[0.625rem] leading-4 text-muted">
            {user.email}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-card border border-line bg-white p-1 shadow-lg"
        >
          <Link
            href="/settings/slack"
            role="menuitem"
            className="flex h-9 w-full items-center gap-2 rounded-field px-3 text-row text-ink hover:bg-field"
          >
            <SlackIcon className="size-4" />
            Slack integration
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-9 w-full items-center gap-2 rounded-field px-3 text-row text-ink hover:bg-field disabled:opacity-60"
          >
            {loggingOut ? (
              <Spinner className="size-4" />
            ) : (
              <LogoutIcon className="size-4 text-muted" />
            )}
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
