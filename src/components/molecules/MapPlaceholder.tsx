import Image from "next/image";

import { cn } from "@/lib/utils";

interface MapPlaceholderProps {
  className?: string;
}

function MapPlaceholder({ className }: MapPlaceholderProps) {
  return (
    <div
      className={cn(
        "bg-primary-50 flex h-36 w-full items-center justify-center rounded-lg",
        className
      )}
    >
      <Image
        src="/images/request-delivery/location.svg"
        alt=""
        width={38}
        height={53}
        className="h-10 w-auto object-contain"
        aria-hidden="true"
      />
    </div>
  );
}

export { MapPlaceholder, type MapPlaceholderProps };
