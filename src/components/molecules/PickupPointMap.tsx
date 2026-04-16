"use client";

import {
  InfoWindow,
  Map,
  Marker,
  useApiIsLoaded,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useMemo } from "react";

import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

interface PickupPointMapProps {
  pickupPoints: PickupPoint[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
  className?: string;
  loadingLabel?: string;
  mapAriaLabel?: string;
}

const BARCELONA_CENTER = { lat: 41.3874, lng: 2.1686 };
const MIN_ZOOM = 15;
const SELECTED_ZOOM = 17;

function MapSkeleton({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "bg-primary-50 flex h-full min-h-56 w-full animate-pulse items-center justify-center rounded-xl",
        className
      )}
    >
      <div className="text-text-muted text-sm">{label}</div>
    </div>
  );
}

function MapInner({
  pickupPoints,
  selectedPointId,
  onSelectPoint,
  className,
  mapAriaLabel,
}: PickupPointMapProps) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");

  const selectedPoint = useMemo(
    () => pickupPoints.find((p) => p.id === selectedPointId),
    [pickupPoints, selectedPointId]
  );

  // Fit all markers with a minimum zoom for same-area points
  const fitBounds = useCallback(() => {
    if (!map || !coreLib || pickupPoints.length === 0) return;

    if (pickupPoints.length === 1) {
      map.panTo({
        lat: pickupPoints[0].latitude,
        lng: pickupPoints[0].longitude,
      });
      map.setZoom(SELECTED_ZOOM);
      return;
    }

    const bounds = new coreLib.LatLngBounds();
    pickupPoints.forEach((point) => {
      bounds.extend({ lat: point.latitude, lng: point.longitude });
    });
    map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });

    // Enforce minimum zoom — same-postcode markers should show at street/neighborhood level
    const listener = map.addListener("idle", () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < MIN_ZOOM) {
        map.setZoom(MIN_ZOOM);
      }
      listener.remove();
    });
  }, [map, coreLib, pickupPoints]);

  useEffect(() => {
    fitBounds();
  }, [fitBounds]);

  // Zoom to street level when a point is selected (from card click)
  useEffect(() => {
    if (!map || !selectedPoint) return;
    map.panTo({ lat: selectedPoint.latitude, lng: selectedPoint.longitude });
    map.setZoom(SELECTED_ZOOM);
  }, [map, selectedPoint]);

  return (
    <div
      role="region"
      aria-label={mapAriaLabel}
      className={cn("h-full min-h-56 w-full overflow-hidden rounded-xl", className)}
    >
      <Map
        defaultCenter={pickupPoints.length > 0 ? undefined : BARCELONA_CENTER}
        defaultZoom={pickupPoints.length > 0 ? undefined : 12}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
      >
        {pickupPoints.map((point) => {
          const isSelected = point.id === selectedPointId;
          return (
            <Marker
              key={point.id}
              position={{ lat: point.latitude, lng: point.longitude }}
              title={`${point.name} — ${point.address}${point.city ? `, ${point.city}` : ""}`}
              onClick={() => onSelectPoint?.(point.id)}
              opacity={selectedPointId && !isSelected ? 0.4 : 1}
              zIndex={isSelected ? 10 : 1}
            />
          );
        })}

        {selectedPoint && (
          <InfoWindow
            position={{ lat: selectedPoint.latitude, lng: selectedPoint.longitude }}
            pixelOffset={[0, -35]}
            onCloseClick={() => onSelectPoint?.("")}
          >
            <div className="max-w-52 p-1">
              <p className="text-sm font-semibold">{selectedPoint.name}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {selectedPoint.address}
                {selectedPoint.city ? `, ${selectedPoint.city}` : ""}
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}

function PickupPointMap(props: PickupPointMapProps) {
  const isLoaded = useApiIsLoaded();

  if (!isLoaded) {
    return <MapSkeleton className={props.className} label={props.loadingLabel} />;
  }

  return <MapInner {...props} />;
}

export { PickupPointMap, type PickupPointMapProps };
