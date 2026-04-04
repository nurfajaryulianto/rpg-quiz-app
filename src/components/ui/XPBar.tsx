"use client";

import { motion } from "framer-motion";

interface XPBarProps {
  current: number;
  max: number;
  level: number;
  showLabel?: boolean;
  className?: string;
}

export default function XPBar({
  current,
  max,
  level,
  showLabel = true,
  className = "",
}: XPBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-primary font-bold">
            LV.{level}
          </span>
          <span className="text-on-surface-variant">
            {current}/{max} XP
          </span>
        </div>
      )}
      <div className="xp-bar-track">
        <motion.div
          className="xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
