interface SpinnerIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Circular loading spinner — 3/4 arc + faint background ring. Rotate via Tailwind `animate-spin` on the className. */
export function SpinnerIcon({ size = 24, color = "currentColor", className }: SpinnerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
