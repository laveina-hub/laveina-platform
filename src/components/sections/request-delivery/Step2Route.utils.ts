// Helpers shared by Step2Route and its sub-columns.

export { haversineKm } from "@/lib/geo";

/** Promise-wrapped browser geolocation — rejects with a typed Error. */
export function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation_unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}
