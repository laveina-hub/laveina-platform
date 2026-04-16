import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const inputStyles =
  "border-border-default text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-primary-400/20 focus:shadow-[0_0_0_3px_rgba(66,165,245,0.1)] w-full rounded-lg border bg-white px-3.5 py-2.5 text-base sm:text-sm transition-all duration-150 focus:ring-2 focus:outline-none";

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
