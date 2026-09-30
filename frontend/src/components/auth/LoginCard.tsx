"use client";

import { useState } from "react";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

import { useAuth } from "./AuthProvider";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled. Please try again.",
};

function describeError(code: string | undefined) {
  if (!code) {
    return null;
  }

  return ERROR_MESSAGES[code] ?? "Google sign-in failed. Please try again.";
}

export function LoginCard({ errorCode }: { errorCode?: string }) {
  const { state } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const message =
    state.status === "error" ? state.message : describeError(errorCode);

  function startGoogleLogin() {
    setRedirecting(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- backend route, not a Next.js page
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="w-full max-w-[30rem] rounded-card border border-line bg-white px-14 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-ink">
        Login
      </h1>

      <Button
        variant="soft"
        className="mt-8 h-12 w-full"
        onClick={startGoogleLogin}
        disabled={redirecting}
      >
        {redirecting ? <Spinner className="size-4" /> : <GoogleIcon />}
        Login with Google
      </Button>

      {message && (
        <p
          role="alert"
          className="mt-4 rounded-field bg-danger/10 px-3 py-2 text-center text-xxs text-danger"
        >
          {message}
        </p>
      )}
    </div>
  );
}
