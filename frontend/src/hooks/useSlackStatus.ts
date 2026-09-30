"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { SlackStatus } from "@/types/api";

type State = {
  key: number;
  status: SlackStatus | null;
  error: string | null;
};

export function useSlackStatus() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({
    key: -1,
    status: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<SlackStatus>("/api/slack/status", { signal: controller.signal })
      .then((status) => setState({ key: reloadKey, status, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        setState((previous) => ({
          key: reloadKey,
          status: previous.status,
          error:
            err instanceof ApiError
              ? err.message
              : "Couldn't load your Slack connection.",
        }));
      });

    return () => controller.abort();
  }, [reloadKey]);

  const settled = state.key === reloadKey;

  return {
    status: state.status,
    loading: !settled && state.status === null,
    refreshing: !settled,
    error: settled ? state.error : null,
    reload: () => setReloadKey((key) => key + 1),
    markDisconnected: () =>
      setState((previous) => ({
        ...previous,
        status: { connected: false },
      })),
  };
}
