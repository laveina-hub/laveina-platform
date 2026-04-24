interface ChevronIconProps {
  size?: number;
  color?: string;
  className?: string;
  /** Chevron direction. Defaults to "left". */
  direction?: "up" | "down" | "left" | "right";
}

const ROTATION: Record<string, number> = {
  left: 0,
  up: 90,
  right: 180,
  down: 270,
};

/** Thin chevron icon from design asset arrow-left.svg. Rotates for all 4 directions; used in back/next navigation across booking wizard, auth, and M2 screens. */
export function ChevronIcon({
  size = 24,
  color = "currentColor",
  className,
  direction = "left",
}: ChevronIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ display: "block", transform: `rotate(${ROTATION[direction]}deg)` }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.9422 7.05718C21.4629 7.57788 21.4629 8.4221 20.9422 8.9428L13.885 16L20.9422 23.0572C21.4629 23.5779 21.4629 24.4221 20.9422 24.9428C20.4215 25.4635 19.5772 25.4635 19.0565 24.9428L11.0565 16.9428C10.5358 16.4221 10.5358 15.5779 11.0565 15.0572L19.0565 7.05718C19.5772 6.53648 20.4215 6.53648 20.9422 7.05718Z"
        fill={color}
      />
    </svg>
  );
}
