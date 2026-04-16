"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const GoogleMapsProvider = dynamic(
  () => import("@/providers/google-maps-provider").then((mod) => mod.GoogleMapsProvider),
  { ssr: false }
);

interface GoogleMapsWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function GoogleMapsWrapper({ children, fallback }: GoogleMapsWrapperProps) {
  return <GoogleMapsProvider fallback={fallback}>{children}</GoogleMapsProvider>;
}

export { GoogleMapsWrapper };
