import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const inputStyles =
  "border-border-default text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-primary-400/20 w-full rounded-lg border bg-white px-4 py-3 text-base transition-colors focus:ring-2 focus:outline-none sm:text-base";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ hasError, className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        inputStyles,
        hasError && "border-error focus:border-error focus:ring-error/20",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input, type InputProps };
