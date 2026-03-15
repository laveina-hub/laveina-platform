import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const labelStyles = "text-text-muted shrink-0 text-base font-medium";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  fixed?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ fixed, className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(labelStyles, fixed && "sm:w-52 sm:text-xl", className)}
      {...props}
    />
  );
});

Label.displayName = "Label";

export { Label, type LabelProps };
