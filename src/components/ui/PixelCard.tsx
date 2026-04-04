"use client";

import { motion } from "framer-motion";

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
  animate?: boolean;
}

export default function PixelCard({
  children,
  className = "",
  gold = false,
  animate = true,
}: PixelCardProps) {
  const baseClass = `bg-white rounded-2xl bubbly-shadow p-4 ${gold ? "border-2 border-primary/20" : ""} ${className}`.trim();

  if (animate) {
    return (
      <motion.div
        className={baseClass}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClass}>{children}</div>;
}
