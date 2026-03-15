import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SectionContainerProps = HTMLAttributes<HTMLDivElement>;

/** Centered max-width container with responsive horizontal padding. */
function SectionContainer({ className, ...props }: SectionContainerProps) {
  return <div className={cn("max-w-container mx-auto px-6 md:px-10", className)} {...props} />;
}

export { SectionContainer, type SectionContainerProps };
