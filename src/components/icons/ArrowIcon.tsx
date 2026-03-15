interface ArrowIconProps {
  size?: number;
  color?: string;
  className?: string;
  /** Arrow direction. Defaults to "right". */
  direction?: "up" | "down" | "left" | "right";
}

const ROTATION: Record<string, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

/** Custom arrow/chevron icon from design assets. Supports all 4 directions via rotation. */
export function ArrowIcon({
  size = 24,
  color = "currentColor",
  className,
  direction = "right",
}: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ transform: `rotate(${ROTATION[direction]}deg)` }}
    >
      <path
        d="M24.25 90c-.896 0-1.792-.342-2.475-1.025a3.501 3.501 0 010-4.949L60.8 45 21.775 5.975a3.502 3.502 0 010-4.95 3.502 3.502 0 014.95 0l41.5 41.5a3.501 3.501 0 010 4.949l-41.5 41.5A3.49 3.49 0 0124.25 90z"
        fill={color}
      />
    </svg>
  );
}
