import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: "h-5 w-5",
  md: "h-10 w-10",
} as const;

const variantStyles = {
  primary: "bg-primary-100",
  light: "bg-primary-50",
} as const;

type IconBadgeSize = keyof typeof sizeStyles;
type IconBadgeVariant = keyof typeof variantStyles;

interface IconBadgeProps {
  children: ReactNode;
  size?: IconBadgeSize;
  variant?: IconBadgeVariant;
  className?: string;
}

/** Circular background wrapper for an icon. */
function IconBadge({ children, size = "sm", variant = "primary", className }: IconBadgeProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export { IconBadge, type IconBadgeProps, type IconBadgeSize, type IconBadgeVariant };
