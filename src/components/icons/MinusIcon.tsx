interface MinusIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Custom minus icon from design assets. */
export function MinusIcon({ size = 14, color = "currentColor", className }: MinusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 7h14" stroke={color} strokeWidth={2} />
    </svg>
  );
}
