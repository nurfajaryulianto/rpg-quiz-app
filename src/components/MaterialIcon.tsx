"use client";

interface MaterialIconProps {
  name: string;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}

export default function MaterialIcon({ name, className = "", fill = false, style }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
