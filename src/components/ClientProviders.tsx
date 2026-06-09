"use client";

import SessionKickedBanner from "@/components/SessionKickedBanner";

/**
 * Thin client-side wrapper rendered inside the root layout (server component).
 * Used to mount global client components (like the session-kicked banner)
 * without converting the root layout itself into a client component.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SessionKickedBanner />
    </>
  );
}
