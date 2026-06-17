"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MaterialIcon from "@/components/MaterialIcon";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized, initError } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] bubbly-shadow border border-white/40 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center text-error mx-auto mb-6">
            <MaterialIcon name="wifi_off" className="text-3xl" fill />
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mb-3">
            Guild Connection Lost
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
            {initError === "timeout"
              ? "The database is taking too long to respond. It might be sleeping or your network connection is unstable. Don't worry, your progress is safe."
              : "A connection error occurred while syncing with the server. Please check your internet connection."}
          </p>
          <button
            onClick={() => {
              initialize();
            }}
            className="w-full py-4 bubbly-gradient text-white font-black rounded-full shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <MaterialIcon name="refresh" />
            Reconnect to Guild
          </button>
        </div>
      </div>
    );
  }

  // Only block rendering during the very first initialization.
  // Once isInitialized is true the auth state (user/participant) is valid —
  // do NOT gate on isLoading here, because token refreshes and login flows
  // also set isLoading:true, which would unmount children and cause a spinner loop.
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Initializing..." />
      </div>
    );
  }

  return <>{children}</>;
}
