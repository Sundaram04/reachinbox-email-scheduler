"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchEmails, type EmailQueryParams } from "@/lib/emails";
import type { EmailRowData, Paginated } from "@/types/api";

type Result = {
  key: string;
  data: Paginated<EmailRowData> | null;
  error: string | null;
};

type UseEmailsOptions = EmailQueryParams & {
  reloadKey: number;
  onSettled?: () => void;
};

export function useEmails({
  scope,
  q,
  status,
  page,
  reloadKey,
  onSettled,
}: UseEmailsOptions) {
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<Result>({
    key: "",
    data: null,
    error: null,
  });
  const settledRef = useRef(onSettled);

  useEffect(() => {
    settledRef.current = onSettled;
  });

  const key = JSON.stringify([scope, q, status, page, reloadKey, retryCount]);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmails({ scope, q, status, page }, controller.signal)
      .then((data) => {
        setResult({ key, data, error: null });
        settledRef.current?.();
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        setResult((previous) => ({
          key,
          data: previous.data,
          error:
            err instanceof ApiError
              ? err.message
              : "Something went wrong. Please try again.",
        }));
        settledRef.current?.();
      });

    return () => controller.abort();
  }, [key, scope, q, status, page]);

  const settled = result.key === key;

  return {
    data: result.data,
    loading: !settled,
    error: settled ? result.error : null,
    retry: () => setRetryCount((count) => count + 1),
  };
}
