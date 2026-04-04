"use client";

import { motion, AnimatePresence } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  icon = "help",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white rounded-2xl bubbly-shadow w-full max-w-sm p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center ${
                variant === "danger" ? "bg-error-container/20" : "bg-primary-container/20"
              }`}
            >
              <MaterialIcon
                name={icon}
                className={`text-3xl ${variant === "danger" ? "text-error" : "text-primary"}`}
                fill
              />
            </div>

            <h3 className="text-xl font-black text-on-surface mb-2">{title}</h3>
            <p className="text-on-surface-variant text-sm mb-8">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 font-bold rounded-xl transition-opacity hover:opacity-90 ${
                  variant === "danger"
                    ? "bg-error text-on-error"
                    : "bg-primary text-on-primary"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
