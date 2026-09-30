"use client";

import { useState } from "react";

import { SlackIcon } from "@/components/icons/SlackIcon";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useSlackStatus } from "@/hooks/useSlackStatus";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function SlackConnectionCard() {
  const toast = useToast();
  const { status, loading, error, reload, markDisconnected } = useSlackStatus();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  function connect() {
    setConnecting(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- backend route that redirects to Slack, not a Next.js page
    window.location.href = "/api/slack/connect";
  }

  async function disconnect() {
    if (disconnecting) {
      return;
    }

    setDisconnecting(true);

    try {
      await api.delete("/api/slack/disconnect");
      markDisconnected();
      toast.success("Slack disconnected");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't disconnect Slack. Please try again.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section
      aria-labelledby="slack-heading"
      className="rounded-card border border-line bg-white p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-field">
          <SlackIcon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="slack-heading" className="text-base font-semibold text-ink">
            Slack notifications
          </h2>
          <p className="mt-1 text-row text-muted">
            Get a Slack message when your emails reach the hourly sending limit,
            so you know sending is paused and the remaining emails have been
            rescheduled.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-6">
        {loading && (
          <div aria-busy="true" className="flex animate-pulse flex-col gap-3">
            <span className="h-4 w-40 rounded bg-chip" />
            <span className="h-9 w-36 rounded-field bg-chip" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-row text-danger">{error}</p>
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && status && !status.connected && (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-row text-muted">
              <span className="size-2 rounded-full bg-faint" />
              Not connected
            </p>
            <Button onClick={connect} disabled={connecting} className="h-10">
              {connecting && (
                <Spinner className="size-4 border-white/50 border-t-white" />
              )}
              {connecting ? "Redirecting to Slack…" : "Connect Slack"}
            </Button>
            <p className="text-xxs text-muted">
              You&apos;ll be sent to Slack to choose a channel. ReachInbox can
              only post to the channel you pick.
            </p>
          </div>
        )}

        {!loading && !error && status?.connected && (
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-2 text-row font-medium text-ink">
              <span className="size-2 rounded-full bg-brand" />
              Connected
            </p>

            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-row">
              <dt className="text-muted">Workspace</dt>
              <dd className="truncate text-ink">{status.teamName ?? "—"}</dd>
              <dt className="text-muted">Channel</dt>
              <dd className="truncate text-ink">{status.channel ?? "—"}</dd>
              <dt className="text-muted">Connected</dt>
              <dd className="text-ink">{formatDateTime(status.connectedAt)}</dd>
            </dl>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={disconnect}
                disabled={disconnecting || connecting}
                className="h-10"
              >
                {disconnecting && <Spinner className="size-4" />}
                {disconnecting ? "Disconnecting…" : "Disconnect Slack"}
              </Button>
              <button
                type="button"
                onClick={connect}
                disabled={disconnecting || connecting}
                className="text-row text-muted hover:text-ink hover:underline disabled:opacity-50"
              >
                {connecting ? "Redirecting…" : "Change channel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
