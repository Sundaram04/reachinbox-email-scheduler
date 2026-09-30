"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

import { useAuth } from "./AuthProvider";

type AuthGateProps = {
  mode: "protected" | "guest";
  children: ReactNode;
};

export function AuthGate({ mode, children }: AuthGateProps) {
  const router = useRouter();
  const { state, refresh } = useAuth();

  useEffect(() => {
    if (mode === "protected" && state.status === "unauthenticated") {
      router.replace("/login");
    }

    if (mode === "guest" && state.status === "authenticated") {
      router.replace("/scheduled");
    }
  }, [mode, state.status, router]);

  if (state.status === "loading") {
    return <LoadingScreen />;
  }

  if (mode === "protected") {
    if (state.status === "error") {
      return (
        <ErrorState
          title="Can't load your account"
          message={state.message}
          onRetry={refresh}
        />
      );
    }

    if (state.status !== "authenticated") {
      return <LoadingScreen />;
    }
  }

  if (mode === "guest" && state.status === "authenticated") {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
