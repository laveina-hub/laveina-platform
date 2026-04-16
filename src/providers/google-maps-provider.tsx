"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { Component, type ErrorInfo, type ReactNode } from "react";

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
  return (
    <MapErrorBoundary fallback={fallback ?? children}>
      <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} libraries={["places"]}>
        {children}
      </APIProvider>
    </MapErrorBoundary>
  );
}
