interface InfoIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Circled "i" info icon. Used inside info banners (e.g. recipient WhatsApp notice). */
export function InfoIcon({ size = 16, color = "currentColor", className }: InfoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.5" />
      <path d="M8 7.25V11.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5.25" r="0.85" fill={color} />
    </svg>
  );
}
