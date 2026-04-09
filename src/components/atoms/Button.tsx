import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [-webkit-tap-highlight-color:transparent]";

const variantStyles = {
  primary: "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white",
  outline:
    "border border-primary-500 text-primary-600 bg-white hover:bg-primary-50 active:bg-primary-100 active:text-primary-700 focus-visible:ring-primary-500",
  ghost: "text-text-primary hover:bg-primary-50 hover:text-primary-600",
  secondary: "bg-secondary-500 hover:bg-primary-600 text-white",
} as const;

const sizeStyles = {
  sm: "rounded-lg px-6 py-2 text-sm",
  md: "rounded-lg px-5 py-2.5 text-sm",
  lg: "rounded-xl px-6 py-3 text-base sm:px-7 sm:py-3.5 sm:text-lg",
  xl: "rounded-md px-6 py-3 text-base 2xl:px-10 2xl:py-7 2xl:text-2xl",
  nav: "rounded-lg px-4 py-2 text-sm xl:px-6 xl:py-3 xl:text-base",
} as const;

type ButtonVariant = keyof typeof variantStyles;
type ButtonSize = keyof typeof sizeStyles;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
