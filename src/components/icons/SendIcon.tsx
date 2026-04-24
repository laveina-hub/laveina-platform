interface SendIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Right-arrow with shaft from design asset send-arrow.svg. Replaces Lucide Send (the design uses an arrow, not a paper plane). Used on "Send now" CTAs and the Next-Day delivery speed. */
export function SendIcon({ size = 24, color = "currentColor", className }: SendIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.4114 3.57741C9.73683 3.25197 10.2645 3.25197 10.5899 3.57741L16.4232 9.41074C16.7487 9.73618 16.7487 10.2638 16.4232 10.5893L10.5899 16.4226C10.2645 16.748 9.73683 16.748 9.4114 16.4226C9.08596 16.0972 9.08596 15.5695 9.4114 15.2441L13.8221 10.8333H4.16732C3.70708 10.8333 3.33398 10.4602 3.33398 10C3.33398 9.53976 3.70708 9.16667 4.16732 9.16667H13.8221L9.4114 4.75592C9.08596 4.43049 9.08596 3.90285 9.4114 3.57741Z"
        fill={color}
      />
    </svg>
  );
}
