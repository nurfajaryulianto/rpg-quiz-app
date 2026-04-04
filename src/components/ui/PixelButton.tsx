"use client";

import { motion } from "framer-motion";

interface PixelButtonProps {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary/90",
  secondary: "bg-surface-container text-on-surface hover:bg-surface-container-high",
  danger: "bg-error text-on-error hover:bg-error/90",
  success: "bg-tertiary text-on-tertiary hover:bg-tertiary/90",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export default function PixelButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
}: PixelButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98, y: 1 }}
      className={`
        font-bold rounded-xl
        transition-colors duration-150
        bubbly-shadow
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `.trim()}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
