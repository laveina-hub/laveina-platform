import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface CardShellProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

function CardShell({ interactive, className, ...props }: CardShellProps) {
  return (
    <div
      className={cn(
        "border-border-default shadow-card overflow-hidden rounded-xl border bg-white",
        interactive && "card-interactive cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export { CardShell, type CardShellProps };
