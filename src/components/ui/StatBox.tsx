"use client";

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: string;
  className?: string;
}

export default function StatBox({ label, value, icon, className = "" }: StatBoxProps) {
  return (
    <div
      className={`bg-white rounded-xl bubbly-shadow p-3 text-center ${className}`}
    >
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      <div className="text-primary font-black text-sm md:text-base">
        {value}
      </div>
      <div className="text-on-surface-variant text-xs mt-1">{label}</div>
    </div>
  );
}
