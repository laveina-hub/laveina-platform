import { type ReactNode } from "react";

import { Label } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface FormRowProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

function FormRow({ label, htmlFor, children, className }: FormRowProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4", className)}>
      <Label htmlFor={htmlFor} fixed>
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export { FormRow, type FormRowProps };
