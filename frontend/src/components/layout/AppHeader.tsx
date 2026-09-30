"use client";

import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { MenuIcon, RefreshIcon } from "@/components/icons/icons";
import { useEmailQuery } from "@/hooks/useEmailQuery";
import { cn } from "@/lib/cn";

const iconButton =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60";

export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { scope, query, setText, setStatus, refresh, refreshing } =
    useEmailQuery();

  return (
    <header className="flex items-center gap-2 px-4 py-3 sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMenu}
        className={cn(iconButton, "lg:hidden")}
      >
        <MenuIcon className="size-5" />
      </button>

      <SearchBar value={query.text} onChange={setText} />

      <FilterMenu scope={scope} value={query.status} onChange={setStatus} />

      <button
        type="button"
        aria-label="Refresh"
        onClick={refresh}
        disabled={refreshing}
        className={iconButton}
      >
        <RefreshIcon className={cn("size-4", refreshing && "animate-spin")} />
      </button>
    </header>
  );
}
