import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardBodyProps = HTMLAttributes<HTMLDivElement>;

/** Standard card content area with consistent padding and vertical spacing. */
function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={cn("space-y-5 px-7 py-7 sm:px-9", className)} {...props} />;
}

export { CardBody, type CardBodyProps };
