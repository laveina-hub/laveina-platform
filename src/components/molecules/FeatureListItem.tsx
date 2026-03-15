import { type ReactNode } from "react";

import { Text } from "@/components/atoms";
import { cn } from "@/lib/utils";

import { IconBadge } from "./IconBadge";

interface FeatureListItemProps {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A list row with a circular icon badge and text label. */
function FeatureListItem({ icon, children, className }: FeatureListItemProps) {
  return (
    <li className={cn("flex items-start gap-3", className)}>
      <IconBadge size="sm" className="mt-1">
        {icon}
      </IconBadge>
      <Text variant="feature" as="span">
        {children}
      </Text>
    </li>
  );
}

export { FeatureListItem, type FeatureListItemProps };
