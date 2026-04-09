import { forwardRef, type SelectHTMLAttributes } from "react";

import { ArrowIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const selectStyles =
  "border-border-default text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-primary-400/20 w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm transition-colors focus:ring-2 focus:outline-none";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <select ref={ref} className={cn(selectStyles, className)} {...props}>
          {children}
        </select>
        <ArrowIcon
          direction="down"
          size={12}
          className="text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps };
