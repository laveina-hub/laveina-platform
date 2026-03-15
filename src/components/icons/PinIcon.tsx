interface PinIconProps {
  className?: string;
}

export function PinIcon({ className = "text-primary-500" }: PinIconProps) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 6a6 6 0 1110.74 3.67l-3.9 4.87a1.1 1.1 0 01-1.68 0L3.26 9.67A5.978 5.978 0 012 6z"
        clipRule="evenodd"
      />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  );
}
