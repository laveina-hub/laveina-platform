"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { useLocale } from "next-intl";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { MAP_REGION } from "@/constants/map";
import { env } from "@/env";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GoogleMaps] Failed to load:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function GoogleMapsProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const locale = useLocale();
  return (
    <MapErrorBoundary fallback={fallback ?? children}>
      <APIProvider
        apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        // `marker` is required for <AdvancedMarker> on Step 2 maps; loading it
        // upfront avoids a second script fetch and prevents a stale rejected
        // bootstrap promise from surfacing when AdvancedMarker first mounts.
        // `places` powers the postcode/address autocomplete in PostcodeSearch.
        libraries={["places", "marker"]}
        region={MAP_REGION}
        language={locale}
      >
        {children}
      </APIProvider>
    </MapErrorBoundary>
  );
}
