"use client";

import SessionKickedBanner from "@/components/SessionKickedBanner";
import SessionChallengeBanner from "@/components/SessionChallengeBanner";

/**
 * Thin client-side wrapper rendered inside the root layout (server component).
 * Used to mount global client components (like session banners)
 * without converting the root layout itself into a client component.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Shown on the NEW device while login is pending — if denied, login is rejected */}
      {/* (handled entirely in authStore, no component needed for the waiting state) */}
      {/* Shown on the EXISTING session when a new device challenges for the account */}
      <SessionChallengeBanner />
      {/* Shown on the EXISTING session when it was displaced (timeout path / session_taken) */}
      <SessionKickedBanner />
    </>
  );
}
