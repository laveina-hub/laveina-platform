interface RouteIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Two-pin route icon used on destination pickup cards alongside the distance label. */
export function RouteIcon({ size = 16, color = "currentColor", className }: RouteIconProps) {
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
      <path
        d="M4 1.333a1.667 1.667 0 0 0-1.667 1.667c0 1.133 1.5 2.833 1.667 3 .167-.167 1.667-1.867 1.667-3A1.667 1.667 0 0 0 4 1.333ZM4 3.333a.333.333 0 1 1 0-.666.333.333 0 0 1 0 .666Z"
        fill={color}
      />
      <path
        d="M12 9.333a1.667 1.667 0 0 0-1.667 1.667c0 1.133 1.5 2.833 1.667 3 .167-.167 1.667-1.867 1.667-3A1.667 1.667 0 0 0 12 9.333Zm0 2a.333.333 0 1 1 0-.666.333.333 0 0 1 0 .666Z"
        fill={color}
      />
      <path
        d="M4.667 6.667v2a2 2 0 0 0 2 2h2.666a2 2 0 0 1 2 2v.666"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 2"
      />
    </svg>
  );
}
