"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // When the user returns to an idle browser tab the access token may have
  // expired and Supabase's background refresh may have hung on a stale TCP
  // connection.  Re-validate the session so the store stays in sync.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      // Only run when we already consider the user initialised (i.e. post-login).
      const { isInitialized: initialized } = useAuthStore.getState();
      if (!initialized) return;

      const { supabase } = await import("@/lib/supabase");
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 8000)
        ),
      ]);

      // Session expired or timed out while idle — clear auth state so the
      // router guard in AppShellInner redirects to /login.
      if (!result.data.session) {
        useAuthStore.setState({ user: null, participant: null });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Initializing..." />
      </div>
    );
  }

  return <>{children}</>;
}
