"use client";

import { motion } from "framer-motion";

export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        className="w-12 h-12 border-4 border-surface-container-high border-t-primary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-4 text-on-surface-variant text-sm">
        {text}
      </p>
    </div>
  );
}
