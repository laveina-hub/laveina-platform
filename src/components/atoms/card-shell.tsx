import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardShellProps = HTMLAttributes<HTMLDivElement>;

function CardShell({ className, ...props }: CardShellProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-white shadow-sm", className)} {...props} />
  );
}

export { CardShell, type CardShellProps };
