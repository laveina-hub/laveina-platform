import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn("flex cursor-pointer items-center gap-2.5 select-none", className)}
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className="border-border-default text-primary-500 focus:ring-primary-400/20 h-4 w-4 rounded transition-colors focus:ring-2 focus:ring-offset-0"
          {...props}
        />
        <span className="text-text-muted text-sm">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
