// ─── Routing service ──────────────────────────────────────────────────────────
// Determines delivery mode from origin + destination postcodes.
//
// Rules (Phase 1):
//   • Both postcodes start with "08" → internal (Barcelona Laveina drivers)
//   • Otherwise, both are valid 5-digit Spanish postcodes → sendcloud
//   • Anything outside Spain (non-5-digit) → blocked
//
// The "08" prefix covers all Barcelona province postcodes (08001–08999).
// Client may update the prefix via the BARCELONA_POSTCODE_PREFIX env var
// once confirmed; code reads it from constants so a single change propagates.

import { DeliveryMode } from "@/types/enums";

// Prefix shared with booking form validation — update here if client changes it.
const BARCELONA_PREFIX = "08";

export type RoutingResult =
  | { mode: "internal" }
  | { mode: "sendcloud" }
  | { mode: "blocked"; reason: string };

/**
 * Returns the delivery mode for a shipment given origin and destination postcodes.
 * Both postcodes must be valid 5-digit strings (already validated by Zod before
 * reaching this function, but we guard defensively).
 */
export function getDeliveryMode(
  originPostcode: string,
  destinationPostcode: string
): RoutingResult {
  if (!isValidSpanishPostcode(originPostcode)) {
    return { mode: "blocked", reason: "routing.invalidOriginPostcode" };
  }
  if (!isValidSpanishPostcode(destinationPostcode)) {
    return { mode: "blocked", reason: "routing.invalidDestinationPostcode" };
  }

  const originIsBarcelona = originPostcode.startsWith(BARCELONA_PREFIX);
  const destinationIsBarcelona = destinationPostcode.startsWith(BARCELONA_PREFIX);

  if (originIsBarcelona && destinationIsBarcelona) {
    return { mode: DeliveryMode.INTERNAL };
  }

  return { mode: DeliveryMode.SENDCLOUD };
}

/**
 * Returns true if the postcode is a valid 5-digit Spanish postcode (00001–52999).
 */
function isValidSpanishPostcode(postcode: string): boolean {
  return /^[0-9]{5}$/.test(postcode);
}

/**
 * Convenience type-guard: returns true when getDeliveryMode resolves to internal.
 */
export function isInternalRoute(result: RoutingResult): result is { mode: "internal" } {
  return result.mode === "internal";
}

/**
 * Convenience type-guard: returns true when getDeliveryMode resolves to sendcloud.
 */
export function isSendcloudRoute(result: RoutingResult): result is { mode: "sendcloud" } {
  return result.mode === "sendcloud";
}
