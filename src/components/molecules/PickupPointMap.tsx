"use client";

import {
  AdvancedMarker,
  InfoWindow,
  Map,
  useApiIsLoaded,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useId, useMemo } from "react";

import { SELECTED_POINT_ZOOM, SPAIN_CENTER, SPAIN_ZOOM } from "@/constants/map";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

export type PickupPointMapSide = "origin" | "destination";

export interface PickupPointMapGroup {
  side: PickupPointMapSide;
  points: PickupPoint[];
  selectedPointId?: string | null;
  onSelectPoint?: (id: string) => void;
}

interface PickupPointMapProps {
  /** Groups to render — typically one per column (Step 2). All markers use
   *  the branded Pin.svg; the selected marker renders larger. */
  groups: PickupPointMapGroup[];
  /** Optional center override (e.g. user's GPS position). Used when there
   *  are no markers to fit bounds around. */
  centerOverride?: { lat: number; lng: number } | null;
  className?: string;
  loadingLabel?: string;
  mapAriaLabel?: string;
}

// Every pickup point is a Laveina location → use the branded Pin.svg on all
// markers, differentiated only by size. Served from /public per
// COMPONENT_GUIDE asset conventions. The SVG viewBox is 81×81 with the pin
// tip at ~(40, 76), i.e. 94% from the top.
const PIN_URL = "/images/map/pin-selected.svg";
const PIN_DEFAULT_SIZE = 34;
const PIN_SELECTED_SIZE = 52;

// AdvancedMarker requires a Map ID. Dev falls back to Google's DEMO_MAP_ID;
// production should set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID via Cloud Console →
// Google Maps Platform → Map Management.
const FALLBACK_MAP_ID = "DEMO_MAP_ID";

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

function MapInner({ groups, centerOverride, className, mapAriaLabel }: PickupPointMapProps) {
  // Unique per-instance id so `useMap(id)` returns THIS column's map
  // instance, not another `<Map>` rendered elsewhere on the page (Step 2
  // has one per column). Without this, the two maps collide on the default
  // useMap() slot and only one gets its fitBounds applied reliably.
  const instanceId = useId();
  const map = useMap(instanceId);
  const coreLib = useMapsLibrary("core");
  const advancedMarkerMapId = env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? FALLBACK_MAP_ID;

  const allPoints = useMemo(() => groups.flatMap((g) => g.points), [groups]);

  // Stable key so the fitBounds effect only re-runs when the underlying
  // point set actually changes, not every render where `groups` is a new
  // array reference.
  const pointsKey = useMemo(
    () =>
      allPoints
        .map((p) => `${p.id}:${p.latitude},${p.longitude}`)
        .sort()
        .join("|"),
    [allPoints]
  );

  const selectedEntry = useMemo(() => {
    for (const g of groups) {
      if (!g.selectedPointId) continue;
      const hit = g.points.find((p) => p.id === g.selectedPointId);
      if (hit) return { point: hit, side: g.side };
    }
    return null;
  }, [groups]);

  // Triple-redundant fitBounds. Google Maps silently ignores fitBounds()
  // calls made before the map container has laid out, so we retry:
  //   1. Immediately — covers the case where the map is already idle
  //   2. Next animation frame — covers the typical layout-after-mount path
  //   3. On the next "idle" event — covers slow tile loads or race conditions
  // `fitted` guards against re-running the work once one of them succeeds.
  useEffect(() => {
    if (!map || !coreLib || allPoints.length === 0) return;

    let cancelled = false;
    let fitted = false;

    const doFit = () => {
      if (cancelled || fitted || !map || !coreLib) return;
      fitted = true;
      if (allPoints.length === 1) {
        map.setCenter({ lat: allPoints[0].latitude, lng: allPoints[0].longitude });
        map.setZoom(SELECTED_POINT_ZOOM);
        return;
      }
      const bounds = new coreLib.LatLngBounds();
      allPoints.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, 50);
    };

    doFit();
    const rafId = requestAnimationFrame(doFit);
    const idleListener = map.addListener("idle", () => {
      // If we're still at country-level zoom after the map settled, the
      // earlier fit calls were no-ops — retry now that the container is
      // guaranteed to have a real size.
      const zoom = map.getZoom();
      if (!fitted && zoom !== undefined && zoom < 10) {
        fitted = false; // force doFit to run
        doFit();
      }
      idleListener.remove();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      idleListener.remove();
    };
    // pointsKey gives allPoints stable identity; listing allPoints here
    // would re-run the effect on every render (new array ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, coreLib, pointsKey]);

  // When there are no markers but a GPS/postcode center exists, pan there so
  // the map shows the entered area instead of country-level Spain.
  useEffect(() => {
    if (!map || allPoints.length > 0 || !centerOverride) return;
    map.setCenter(centerOverride);
    map.setZoom(13);
  }, [map, allPoints.length, centerOverride]);

  const handleSelect = useCallback(
    (side: PickupPointMapSide, id: string) => {
      const group = groups.find((g) => g.side === side);
      group?.onSelectPoint?.(id);
    },
    [groups]
  );

  return (
    <div
      role="region"
      aria-label={mapAriaLabel}
      className={cn("h-full min-h-56 w-full overflow-hidden rounded-xl", className)}
    >
      <Map
        id={instanceId}
        mapId={advancedMarkerMapId}
        defaultCenter={centerOverride ?? SPAIN_CENTER}
        defaultZoom={centerOverride ? 13 : SPAIN_ZOOM}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
      >
        {groups.map((g) =>
          g.points.map((point) => {
            const isSelected = point.id === g.selectedPointId;
            const size = isSelected ? PIN_SELECTED_SIZE : PIN_DEFAULT_SIZE;
            return (
              <AdvancedMarker
                key={`${g.side}-${point.id}`}
                position={{ lat: point.latitude, lng: point.longitude }}
                title={`${point.name} — ${point.address}${point.city ? `, ${point.city}` : ""}`}
                onClick={() => handleSelect(g.side, point.id)}
                zIndex={isSelected ? 10 : 1}
                anchorLeft="-50%"
                anchorTop="-94%"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PIN_URL}
                  width={size}
                  height={size}
                  alt={point.name}
                  draggable={false}
                  style={{ display: "block" }}
                />
              </AdvancedMarker>
            );
          })
        )}

        {selectedEntry && (
          <InfoWindow
            position={{
              lat: selectedEntry.point.latitude,
              lng: selectedEntry.point.longitude,
            }}
            pixelOffset={[0, -55]}
            onCloseClick={() => handleSelect(selectedEntry.side, "")}
          >
            <div className="max-w-52 p-1">
              <p className="text-sm font-semibold">{selectedEntry.point.name}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {selectedEntry.point.address}
                {selectedEntry.point.city ? `, ${selectedEntry.point.city}` : ""}
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
