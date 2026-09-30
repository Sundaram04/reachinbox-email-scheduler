"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { ArrowLeftIcon } from "@/components/icons/icons";
import { useToast } from "@/components/ui/Toast";

import { SlackConnectionCard } from "./SlackConnectionCard";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Slack authorization was cancelled.",
};

type SlackPageProps = {
  result?: string;
  reason?: string;
};

export function SlackPage({ result, reason }: SlackPageProps) {
  const router = useRouter();
  const toast = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !result) {
      return;
    }

    handled.current = true;

    if (result === "connected") {
      toast.success("Slack connected");
    } else if (result === "error") {
      toast.error(
        (reason && ERROR_MESSAGES[reason]) ??
          "Couldn't connect Slack. Please try again.",
      );
    }

    router.replace("/settings/slack");
  }, [result, reason, router, toast]);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/scheduled");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-field"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-normal text-ink sm:text-xl">
          Slack Integration
        </h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">
        <SlackConnectionCard />
      </main>
    </div>
  );
}
