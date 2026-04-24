interface MastercardIconProps {
  size?: number;
  className?: string;
}

/** Mastercard brand mark (red + yellow overlapping circles) from design asset mastercard.svg. Brand colors hardcoded. */
export function MastercardIcon({ size = 24, className }: MastercardIconProps) {
  const width = size;
  const height = Math.round((size * 13) / 20);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mastercard"
      role="img"
    >
      <g clipPath="url(#mastercard-clip)">
        <path
          d="M6.25 13C9.70178 13 12.5 10.0899 12.5 6.5C12.5 2.91015 9.70178 0 6.25 0C2.79822 0 0 2.91015 0 6.5C0 10.0899 2.79822 13 6.25 13Z"
          fill="#F93232"
        />
        <path
          d="M13.75 0C12.3463 0 11.055 0.4875 10.0125 1.3H10V1.3091C9.7525 1.5028 9.525 1.7212 9.30812 1.95H10.6919C10.8844 2.15345 11.0619 2.3712 11.2263 2.6H8.76875C8.6175 2.80735 8.47875 3.0238 8.35188 3.25H11.6419C11.7594 3.4606 11.87 3.6751 11.9656 3.9H8.03375C7.94438 4.11125 7.86563 4.3277 7.79813 4.55H12.2006C12.2656 4.7619 12.3169 4.97965 12.3619 5.2H7.635C7.59312 5.4132 7.55813 5.629 7.53688 5.85H12.4625C12.4869 6.0632 12.5 6.27965 12.5 6.5H7.5C7.5 6.72035 7.51688 6.9355 7.5375 7.15H12.4637C12.44 7.37035 12.4056 7.5868 12.3625 7.8H7.63563C7.67875 8.02165 7.73437 8.23745 7.79875 8.45H12.2013C12.1337 8.6723 12.055 8.88875 11.9656 9.1H8.03375C8.12813 9.3236 8.23438 9.5407 8.35188 9.75H11.6419C11.5156 9.9762 11.375 10.1926 11.2238 10.4H8.76875C8.935 10.6288 9.11438 10.8465 9.3075 11.05H10.6919C10.4744 11.2794 10.2475 11.4972 10 11.6909C11.045 12.5092 12.3406 13 13.75 13C17.2019 13 20 10.0893 20 6.5C20 2.9107 17.2019 0 13.75 0Z"
          fill="#FED049"
        />
      </g>
      <defs>
        <clipPath id="mastercard-clip">
          <rect width="20" height="13" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
