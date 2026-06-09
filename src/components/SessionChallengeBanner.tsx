"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import MaterialIcon from "@/components/MaterialIcon";

const COUNTDOWN_SECONDS = 10;

/**
 * Banner shown on the EXISTING session when a new device is trying to login
 * with the same account.
 *
 * Default action on timeout = "deny" (protect the active session).
 * The user can explicitly click "Izinkan & Logout" to let the new device in.
 */
export default function SessionChallengeBanner() {
  const { sessionChallenge, respondToChallenge } = useAuthStore();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const respondedRef = useRef(false);

  // Reset and start countdown whenever a new challenge arrives
  useEffect(() => {
    if (!sessionChallenge) {
      respondedRef.current = false;
      setCountdown(COUNTDOWN_SECONDS);
      return;
    }

    setCountdown(COUNTDOWN_SECONDS);
    respondedRef.current = false;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          // Timeout default: deny — protect the active session
          if (!respondedRef.current) {
            respondedRef.current = true;
            respondToChallenge("deny");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChallenge]);

  const handleDeny = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!respondedRef.current) {
      respondedRef.current = true;
      respondToChallenge("deny");
    }
  };

  const handleAllow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!respondedRef.current) {
      respondedRef.current = true;
      respondToChallenge("allow");
    }
  };

  return (
    <AnimatePresence>
      {sessionChallenge && (
        <motion.div
          key={`challenge-${sessionChallenge.challengeId}`}
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-0 left-0 w-full z-[9999] flex justify-center pointer-events-none px-4 pt-4"
        >
          <div className="pointer-events-auto w-full max-w-lg bg-amber-500 text-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Animated progress bar */}
            <motion.div
              key={`bar-${sessionChallenge.challengeId}`}
              className="h-1.5 bg-white/30 origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: COUNTDOWN_SECONDS, ease: "linear" }}
            />

            <div className="p-5 flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MaterialIcon name="login" className="text-white text-xl" fill />
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-base leading-tight mb-1">
                  Percobaan Login Terdeteksi!
                </p>
                <p className="text-sm text-white/90 leading-snug mb-1">
                  Ada yang mencoba masuk ke akun ini dari{" "}
                  <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded font-mono text-xs">
                    {sessionChallenge.ip}
                  </span>
                </p>
                <p className="text-xs text-white/75">
                  Jika bukan Anda, klik <strong>Pertahankan</strong> untuk menolak.
                  Otomatis ditolak dalam{" "}
                  <span className="font-black text-white">{countdown}</span> detik.
                </p>
              </div>

              {/* Countdown ring */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <motion.circle
                    key={`ring-${sessionChallenge.challengeId}`}
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
                onClick={handleDeny}
                className="flex-1 py-2.5 rounded-xl bg-white/25 hover:bg-white/40 text-white font-black text-sm transition-colors"
              >
                Pertahankan Sesi
              </button>
              <button
                onClick={handleAllow}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 font-bold text-sm transition-colors"
              >
                Izinkan &amp; Logout
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
