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

import { api, ApiError, setUnauthorizedHandler } from "@/lib/api";
import type { User } from "@/types/api";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthState(): Promise<AuthState> {
  try {
    const user = await api.get<User>("/api/me");

    return { status: "authenticated", user };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { status: "unauthenticated" };
    }

    return {
      status: "error",
      message:
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    setState(await fetchAuthState());
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchAuthState().then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "unauthenticated" }));

    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({ state, refresh, logout }),
    [state, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
