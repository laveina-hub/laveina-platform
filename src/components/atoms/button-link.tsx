import { type ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 focus-visible:outline-none";

const variantStyles = {
  primary: "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white",
  outline:
    "border border-primary-500 text-primary-600 bg-white hover:bg-primary-50 focus-visible:ring-primary-500",
  secondary: "bg-secondary-500 hover:bg-primary-600 text-white",
} as const;

const sizeStyles = {
  sm: "rounded-lg px-4 py-2 text-sm",
  md: "rounded-md px-4 py-3 text-base",
  lg: "rounded-lg px-6 py-3 text-sm lg:text-lg",
  xl: "rounded-md px-6 py-3 text-base 2xl:px-10 2xl:py-7 2xl:text-2xl",
  hero: "rounded-md px-4 py-3 md:text-base 2xl:py-5 2xl:text-2xl",
  pricing: "rounded-xl px-4 py-3 text-2xl sm:text-base xl:text-2xl",
  nav: "rounded-lg px-6 py-2 text-base xl:px-10 xl:py-4 xl:text-2xl",
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
