"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type NavItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  onNavigate?: () => void;
};

export function NavItem({
  href,
  label,
  icon,
  trailing,
  onNavigate,
}: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-[0.625rem] px-3 text-row transition-colors",
        active
          ? "bg-brand-soft font-semibold text-ink"
          : "text-ink/85 hover:bg-field",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}
