"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchSenders } from "@/lib/emails";
import type { Sender } from "@/types/api";

type State = {
  key: number;
  senders: Sender[];
  error: string | null;
};

export function useSenders() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({
    key: -1,
    senders: [],
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchSenders(controller.signal)
      .then((senders) => setState({ key: reloadKey, senders, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        setState((previous) => ({
          key: reloadKey,
          senders: previous.senders,
          error:
            err instanceof ApiError
              ? err.message
              : "Couldn't load your senders.",
        }));
      });

    return () => controller.abort();
  }, [reloadKey]);

  const addSender = useCallback((sender: Sender) => {
    setState((previous) => ({
      ...previous,
      senders: [...previous.senders, sender],
    }));
  }, []);

  return {
    senders: state.senders,
    loading: state.key !== reloadKey,
    error: state.key === reloadKey ? state.error : null,
    reload: () => setReloadKey((key) => key + 1),
    addSender,
  };
}
