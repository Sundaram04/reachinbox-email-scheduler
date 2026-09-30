"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import type { EmailItem, Paginated } from "@/types/api";

export type CountValue = number | "loading" | "unavailable";

type MailCounts = {
  scheduled: CountValue;
  sent: CountValue;
};

type MailCountsContextValue = MailCounts & {
  refreshing: boolean;
  refresh: () => Promise<void>;
};

const MailCountsContext = createContext<MailCountsContextValue | null>(null);

async function fetchTotal(path: string): Promise<CountValue> {
  try {
    const page = await api.get<Paginated<EmailItem>>(path, {
      query: { limit: 1, offset: 0 },
    });

    return page.total;
  } catch {
    return "unavailable";
  }
}

async function fetchCounts(): Promise<MailCounts> {
  const [scheduled, sent] = await Promise.all([
    fetchTotal("/api/emails/scheduled"),
    fetchTotal("/api/emails/sent"),
  ]);

  return { scheduled, sent };
}

export function MailCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<MailCounts>({
    scheduled: "loading",
    sent: "loading",
  });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setCounts(await fetchCounts());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchCounts().then((next) => {
      if (!cancelled) {
        setCounts(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ ...counts, refreshing, refresh }),
    [counts, refreshing, refresh],
  );

  return (
    <MailCountsContext.Provider value={value}>
      {children}
    </MailCountsContext.Provider>
  );
}

export function useMailCounts() {
  const context = useContext(MailCountsContext);

  if (!context) {
    throw new Error("useMailCounts must be used inside MailCountsProvider");
  }

  return context;
}
