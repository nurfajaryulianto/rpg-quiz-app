"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  onTimeUp: () => void;
  onTick: (remaining: number) => void;
  isPaused?: boolean;
}

export default function Timer({
  timeRemaining,
  totalTime,
  onTimeUp,
  onTick,
  isPaused = false,
}: TimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(timeRemaining);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  // Keep refs up to date
  onTimeUpRef.current = onTimeUp;
  onTickRef.current = onTick;

  useEffect(() => {
    timeRef.current = timeRemaining;
  }, [timeRemaining]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPaused) {
      clearTimer();
      return;
    }

    clearTimer();
    intervalRef.current = setInterval(() => {
      timeRef.current -= 1;
      if (timeRef.current <= 0) {
        timeRef.current = 0;
        clearTimer();
        onTimeUpRef.current();
      }
      onTickRef.current(timeRef.current);
    }, 1000);

    return clearTimer;
  }, [isPaused, clearTimer]);

  const percentage = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  const isLow = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="text-on-surface-variant">⏱ Time</span>
        <span
          className={`font-bold text-xs ${
            isCritical
              ? "text-error animate-pulse"
              : isLow
              ? "text-rpg-streak"
              : "text-on-surface"
          }`}
        >
          {timeRemaining}s
        </span>
      </div>
      <div className="timer-bar-track">
        <motion.div
          className={`timer-bar-fill ${
            isCritical
              ? "bg-error animate-pulse"
              : isLow
              ? "bg-rpg-streak"
              : "bg-primary"
          }`}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "linear" }}
        />
      </div>
    </div>
  );
}
