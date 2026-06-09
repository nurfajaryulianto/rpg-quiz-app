"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
