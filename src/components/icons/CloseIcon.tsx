interface CloseIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Custom close/X icon from design asset close.svg. */
export function CloseIcon({ size = 24, color = "currentColor", className }: CloseIconProps) {
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
        d="M8 90c-2.047 0-4.095-.781-5.657-2.343-3.125-3.125-3.125-8.189 0-11.314l74-74c3.125-3.124 8.189-3.124 11.314 0 3.124 3.124 3.124 8.189 0 11.313l-74 74C12.095 89.219 10.047 90 8 90z"
        fill={color}
      />
      <path
        d="M82 90c-2.048 0-4.095-.781-5.657-2.343l-74-74c-3.125-3.124-3.125-8.189 0-11.313 3.124-3.124 8.189-3.124 11.313 0l74 74c3.124 3.125 3.124 8.189 0 11.314C86.095 89.219 84.048 90 82 90z"
        fill={color}
      />
    </svg>
  );
}
