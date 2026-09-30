"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useMailCounts } from "@/hooks/useMailCounts";
import type { EmailScope, EmailStatus } from "@/types/api";

export type ScopeQuery = {
  text: string;
  status: EmailStatus | null;
  page: number;
};

type EmailQueryContextValue = {
  scope: EmailScope;
  query: ScopeQuery;
  setText: (text: string) => void;
  setStatus: (status: EmailStatus | null) => void;
  setPage: (page: number) => void;
  reloadKey: number;
  refreshing: boolean;
  refresh: () => void;
  finishRefresh: () => void;
};

const EMPTY: ScopeQuery = { text: "", status: null, page: 0 };

const EmailQueryContext = createContext<EmailQueryContextValue | null>(null);

export function EmailQueryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scope: EmailScope = pathname.startsWith("/sent") ? "sent" : "scheduled";
  const counts = useMailCounts();

  const [queries, setQueries] = useState<Record<EmailScope, ScopeQuery>>({
    scheduled: EMPTY,
    sent: EMPTY,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [listRefreshing, setListRefreshing] = useState(false);

  const update = useCallback(
    (patch: Partial<ScopeQuery>) =>
      setQueries((previous) => ({
        ...previous,
        [scope]: { ...previous[scope], ...patch },
      })),
    [scope],
  );

  const setText = useCallback(
    (text: string) => update({ text, page: 0 }),
    [update],
  );
  const setStatus = useCallback(
    (status: EmailStatus | null) => update({ status, page: 0 }),
    [update],
  );
  const setPage = useCallback((page: number) => update({ page }), [update]);

  const refreshing = listRefreshing || counts.refreshing;

  const refresh = useCallback(() => {
    if (refreshing) {
      return;
    }

    setListRefreshing(true);
    setReloadKey((key) => key + 1);
    void counts.refresh();
  }, [refreshing, counts]);

  const finishRefresh = useCallback(() => setListRefreshing(false), []);

  const value = useMemo(
    () => ({
      scope,
      query: queries[scope],
      setText,
      setStatus,
      setPage,
      reloadKey,
      refreshing,
      refresh,
      finishRefresh,
    }),
    [
      scope,
      queries,
      setText,
      setStatus,
      setPage,
      reloadKey,
      refreshing,
      refresh,
      finishRefresh,
    ],
  );

  return (
    <EmailQueryContext.Provider value={value}>
      {children}
    </EmailQueryContext.Provider>
  );
}

export function useEmailQuery() {
  const context = useContext(EmailQueryContext);

  if (!context) {
    throw new Error("useEmailQuery must be used inside EmailQueryProvider");
  }

  return context;
}
