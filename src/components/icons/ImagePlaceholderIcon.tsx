interface ImagePlaceholderIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Neutral empty-state image placeholder. Used as the fallback when a pickup-point photo fails to load or is missing. */
export function ImagePlaceholderIcon({
  size = 24,
  color = "currentColor",
  className,
}: ImagePlaceholderIconProps) {
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
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5" />
      <circle cx="8.5" cy="9" r="1.25" fill={color} />
      <path
        d="M4 17.5L9 12.5L13.5 17L16.5 14L20 17.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
