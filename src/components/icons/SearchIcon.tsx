interface SearchIconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Magnifier/search icon from design asset search.svg. Used in tracking/postcode search inputs. */
export function SearchIcon({ size = 24, color = "currentColor", className }: SearchIconProps) {
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
        d="M9.58268 3.33333C6.1309 3.33333 3.33268 6.13155 3.33268 9.58333C3.33268 13.0351 6.1309 15.8333 9.58268 15.8333C11.2603 15.8333 12.7835 15.1724 13.9061 14.0967C13.932 14.0608 13.9612 14.0264 13.9935 13.9941C14.0259 13.9617 14.0602 13.9326 14.0961 13.9067C15.1718 12.7841 15.8327 11.2609 15.8327 9.58333C15.8327 6.13155 13.0345 3.33333 9.58268 3.33333ZM15.739 14.5611C16.8399 13.2012 17.4993 11.4693 17.4993 9.58333C17.4993 5.21108 13.9549 1.66667 9.58268 1.66667C5.21043 1.66667 1.66602 5.21108 1.66602 9.58333C1.66602 13.9556 5.21043 17.5 9.58268 17.5C11.4687 17.5 13.2006 16.8405 14.5605 15.7396L16.9101 18.0892C17.2355 18.4147 17.7632 18.4147 18.0886 18.0893C18.414 17.7638 18.414 17.2362 18.0886 16.9108L15.739 14.5611Z"
        fill={color}
      />
    </svg>
  );
}
