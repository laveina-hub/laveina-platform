interface ZapIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Lightning bolt icon from design asset lightning-57.svg. Represents the "Express" delivery speed. */
export function ZapIcon({ size = 24, color = "currentColor", className }: ZapIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M785.07008 409.6h-204.8l68.25984-307.2-409.6 512h204.8l-68.25984 307.2 409.6-512zM380.96896 546.14016l137.10336-171.3664-22.89664 103.09632h147.85536L505.92768 649.2672l22.89664-103.12704H380.96896z"
        fill={color}
      />
    </svg>
  );
}
