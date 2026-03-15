import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SectionContainerProps = HTMLAttributes<HTMLDivElement>;

function SectionContainer({ className, ...props }: SectionContainerProps) {
  return <div className={cn("max-w-container mx-auto px-6 md:px-10", className)} {...props} />;
}

export { SectionContainer, type SectionContainerProps };
