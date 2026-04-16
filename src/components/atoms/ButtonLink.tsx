import { type ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.98]";

const variantStyles = {
  primary:
    "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-xs hover:shadow-sm",
  outline:
    "border border-primary-500 text-primary-600 bg-white hover:bg-primary-50 active:bg-primary-100",
  secondary:
    "bg-secondary-500 hover:bg-secondary-600 active:bg-secondary-700 text-white shadow-xs hover:shadow-sm",
} as const;

const sizeStyles = {
  sm: "rounded-lg px-4 py-2 text-sm",
  md: "rounded-lg px-4 py-3 text-base",
  lg: "rounded-xl px-6 py-3 text-sm lg:text-lg",
  xl: "rounded-xl px-6 py-3 text-base 2xl:px-10 2xl:py-7 2xl:text-2xl",
  hero: "rounded-xl px-4 py-3 md:text-base 2xl:py-5 2xl:text-2xl",
  pricing: "rounded-xl px-4 py-3 text-2xl sm:text-base xl:text-2xl",
  nav: "rounded-lg px-4 py-2 text-sm xl:px-6 xl:py-3 xl:text-base",
} as const;

type ButtonLinkVariant = keyof typeof variantStyles;
type ButtonLinkSize = keyof typeof sizeStyles;

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
}

function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  );
}

export { ButtonLink, type ButtonLinkProps, type ButtonLinkVariant, type ButtonLinkSize };
