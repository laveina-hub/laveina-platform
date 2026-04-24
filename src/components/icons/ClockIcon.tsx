interface ClockIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Custom clock icon from design asset clock.svg. Used for working hours, ETA indicators, and the Standard delivery speed. */
export function ClockIcon({ size = 24, color = "currentColor", className }: ClockIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.33333 1.33333C4.01962 1.33333 1.33333 4.01962 1.33333 7.33333C1.33333 10.647 4.01962 13.3333 7.33333 13.3333C10.647 13.3333 13.3333 10.647 13.3333 7.33333C13.3333 4.01962 10.647 1.33333 7.33333 1.33333ZM0 7.33333C0 3.28325 3.28325 0 7.33333 0C11.3834 0 14.6667 3.28325 14.6667 7.33333C14.6667 11.3834 11.3834 14.6667 7.33333 14.6667C3.28325 14.6667 0 11.3834 0 7.33333ZM7.33333 2.66667C7.70152 2.66667 8 2.96514 8 3.33333V6.92131L10.2981 8.07038C10.6275 8.23504 10.7609 8.63549 10.5963 8.96481C10.4316 9.29413 10.0312 9.42761 9.70186 9.26295L7.03519 7.92962C6.80934 7.81669 6.66667 7.58585 6.66667 7.33333V3.33333C6.66667 2.96514 6.96514 2.66667 7.33333 2.66667Z"
        fill={color}
      />
    </svg>
  );
}
