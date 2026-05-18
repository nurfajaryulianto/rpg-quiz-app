"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import AuthProvider from "./AuthProvider";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MaterialIcon from "./MaterialIcon";
import LoadingSpinner from "./ui/LoadingSpinner";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, participant, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push("/login");
      return;
    }
    // Character creation temporarily disabled — redirect away if someone lands on it
    if (pathname === "/create-character") {
      router.push("/");
    }
  }, [user, isInitialized, router, pathname]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner text="Redirecting..." />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <MaterialIcon name="error_outline" className="text-5xl text-error mb-4" />
          <h2 className="text-xl font-bold text-on-surface mb-2">Profile Not Found</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Your account exists but no participant profile was created.
          </p>
          <button
            onClick={() => { useAuthStore.getState().logout(); router.push("/login"); }}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold bubbly-shadow"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopBar />
      <Sidebar />

      <main className="lg:ml-64 pt-28 pb-24 lg:pb-12 px-4 md:px-8 min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Library Background"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7zbNjUvXhjDq5TurbB9wl0aCu8AwvQnTlAqEtnmbW5hHFIE27Xft3ugXDb3ZCKv91SMC1VDD1CWj5jrzCJhhMC8b8ySOCMMtW0FJIZsC7PFVJhv6Zz9JHDZlJtpF5wehLw1M1nXaXd6KDKhPOSM4okknSLueyT-yFVvdscBG2O4vPw-fePN6TKXhvBRJ2cNah5lPwh7bUDfZt-l9HK2eKpfWQHSwpJ5mZM-1bxHYQ1yalRxsCXRdI2CAfG_yFeO4IAIOkvqVL8Q"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/90 via-surface/60 to-surface" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileNav />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellInner>{children}</AppShellInner>
    </AuthProvider>
  );
}
