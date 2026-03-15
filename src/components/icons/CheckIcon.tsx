interface CheckIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Custom checkmark icon from design asset check-mark-10127.svg. Pure checkmark only — wrap with a rounded container for background styling. */
export function CheckIcon({ size = 24, color = "currentColor", className }: CheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M33 78c-2.303 0-4.606-.879-6.364-2.636l-24-24c-3.515-3.515-3.515-9.213 0-12.728 3.515-3.515 9.213-3.515 12.728 0L33 56.272l41.636-41.636c3.516-3.515 9.213-3.515 12.729 0 3.515 3.515 3.515 9.213 0 12.728l-48 48C37.606 77.121 35.303 78 33 78z"
        fill={color}
      />
    </svg>
  );
}
