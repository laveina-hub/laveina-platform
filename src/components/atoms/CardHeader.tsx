import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CardHeaderProps {
  title: ReactNode;
  className?: string;
}

function CardHeader({ title, className }: CardHeaderProps) {
  return (
    <div className={cn("border-border-muted bg-bg-light border-b px-10 py-8", className)}>
      <h2 className="font-body text-text-muted text-2xl font-medium sm:text-4xl">{title}</h2>
    </div>
  );
}

export { CardHeader, type CardHeaderProps };
