import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const inputStyles =
  "border-border-default text-text-primary placeholder:text-text-muted focus:border-primary-400 w-full rounded-lg border bg-white px-4 py-4 text-base focus:outline-none sm:text-lg";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return <input ref={ref} className={cn(inputStyles, className)} {...props} />;
});

Input.displayName = "Input";

export { Input, type InputProps };
