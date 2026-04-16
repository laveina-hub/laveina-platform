"use client";

import type { ReactNode } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: "none" | "short" | "medium";
}

const delayStyles = {
  none: "",
  short: "delay-100",
  medium: "delay-200",
} as const;

export function RevealOnScroll({ children, className, delay = "none" }: RevealOnScrollProps) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        delayStyles[delay],
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
