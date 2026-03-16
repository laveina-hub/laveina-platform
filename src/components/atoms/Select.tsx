import { forwardRef, type SelectHTMLAttributes } from "react";

import { ArrowIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const selectStyles =
  "border-primary-400 text-text-primary focus:border-primary-500 w-full appearance-none rounded-lg border bg-white px-4 py-4 pr-10 text-base focus:outline-none sm:text-lg";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select ref={ref} className={cn(selectStyles, className)} {...props}>
          {children}
        </select>
        <ArrowIcon
          direction="down"
          size={16}
          className="text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps };
