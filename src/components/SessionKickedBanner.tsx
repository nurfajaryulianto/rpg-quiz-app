"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";

const COUNTDOWN_SECONDS = 7;

/**
 * Global banner that appears when another device / IP logs in with the same
 * account.  Shows a countdown and forces logout after COUNTDOWN_SECONDS.
 * Must be mounted at root layout level so it renders on every page.
 */
export default function SessionKickedBanner() {
  const router = useRouter();
  const { kickedInfo, clearKick, performKickLogout } = useAuthStore();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown whenever a new kick event fires
  useEffect(() => {
    if (!kickedInfo) {
      setCountdown(COUNTDOWN_SECONDS);
      return;
    }

    setCountdown(COUNTDOWN_SECONDS);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          performKickLogout().then(() => {
            router.push("/login");
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kickedInfo]);

  return (
    <AnimatePresence>
      {kickedInfo && (
        <motion.div
          key="session-kicked"
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-0 left-0 w-full z-[9999] flex justify-center pointer-events-none px-4 pt-4"
        >
          <div className="pointer-events-auto w-full max-w-lg bg-error text-on-error rounded-2xl shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <motion.div
              className="h-1 bg-white/30 origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: COUNTDOWN_SECONDS, ease: "linear" }}
            />

            <div className="p-5 flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MaterialIcon name="security" className="text-white text-xl" fill />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-base leading-tight mb-1">
                  Akun Anda Diakses dari Perangkat Lain
                </p>
                <p className="text-sm text-white/85 leading-snug mb-2">
                  Login baru terdeteksi dari{" "}
                  <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded font-mono text-xs">
                    {kickedInfo.ip}
                  </span>
                  . Sesi Anda akan berakhir dalam{" "}
                  <span className="font-black text-white">{countdown}</span> detik.
                </p>
                <p className="text-xs text-white/70">
                  Jika bukan Anda, segera ubah password setelah login kembali.
                </p>
              </div>

              {/* Countdown ring */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <motion.circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 20 }}
                    transition={{ duration: COUNTDOWN_SECONDS, ease: "linear" }}
                  />
                </svg>
                <span className="font-black text-white text-lg z-10">{countdown}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-4 flex gap-2">
              <button
                onClick={async () => {
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  await performKickLogout();
                  router.push("/login");
                }}
                className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-colors"
              >
                Logout Sekarang
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
