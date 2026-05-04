"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

// Q6.8 — resolve a Spanish 5-digit postcode to a lat/lng centre so the
// pickup-point cards can show "distance from postcode centre" whenever GPS
// isn't shared. The hook is shape-stable per postcode (Google's geocoder
// hits cache for repeat queries) and clears whenever the postcode shrinks
// below five digits, so callers never see stale coordinates.

export type LatLng = { lat: number; lng: number };

export function usePostcodeCenter(postcode: string): LatLng | null {
  const geocodingLib = useMapsLibrary("geocoding");
  const [center, setCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!geocodingLib || !/^[0-9]{5}$/.test(postcode)) {
      setCenter(null);
      return;
    }
    let cancelled = false;
    const geocoder = new geocodingLib.Geocoder();
    geocoder
      .geocode({
        address: postcode,
        componentRestrictions: { country: "ES" },
      })
      .then(({ results }) => {
        if (cancelled) return;
        const first = results[0]?.geometry?.location;
        setCenter(first ? { lat: first.lat(), lng: first.lng() } : null);
      })
      .catch(() => {
        if (!cancelled) setCenter(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postcode, geocodingLib]);

  return center;
}
