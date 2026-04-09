import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DividerProps = HTMLAttributes<HTMLHRElement>;

function Divider({ className, ...props }: DividerProps) {
  return <hr className={cn("border-border-default border-t", className)} {...props} />;
}

export { Divider, type DividerProps };
