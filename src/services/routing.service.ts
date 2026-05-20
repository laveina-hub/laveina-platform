// Both postcodes "08xxx" → internal (Barcelona), otherwise → SendCloud.

import { DeliveryMode } from "@/types/enums";

const BARCELONA_PREFIX = "08";

// Spanish postcodes are 5 digits where the first two encode the province
// (01–52). 53–99 and 00 are unallocated — accepting them lets typos through
// to SendCloud, where they come back as "no eligible rates" with no postcode
// hint for the user. Gating here gives a clean, localizable error at the
// booking-wizard boundary instead.
const MIN_SPANISH_PROVINCE = 1;
const MAX_SPANISH_PROVINCE = 52;

export type RoutingResult =
  | { mode: "internal" }
  | { mode: "sendcloud" }
  | { mode: "blocked"; reason: string };

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
 * Validates a Spanish postcode: exactly 5 digits AND the first two digits
 * encode a real province (01–52). Rejects "00xxx" and "53xxx"–"99xxx".
 * Exported so callers (validations/, /api/shipments/quote) can rely on the
 * same definition the routing decision uses.
 */
export function isValidSpanishPostcode(postcode: string): boolean {
  if (!/^[0-9]{5}$/.test(postcode)) return false;
  const province = parseInt(postcode.slice(0, 2), 10);
  return province >= MIN_SPANISH_PROVINCE && province <= MAX_SPANISH_PROVINCE;
}

export function isInternalRoute(result: RoutingResult): result is { mode: "internal" } {
  return result.mode === "internal";
}

export function isSendcloudRoute(result: RoutingResult): result is { mode: "sendcloud" } {
  return result.mode === "sendcloud";
}

/**
 * Lightweight Barcelona-route check used by the Step 2 speed auto-switch (A2).
 * True only when both postcodes are valid Spanish format AND both start with 08.
 * Returns false for invalid/partial input so the caller treats unresolved
 * routes as non-Barcelona (safe default that disables Next Day).
 */
export function isBarcelonaRoute(originPostcode: string, destinationPostcode: string): boolean {
  if (!isValidSpanishPostcode(originPostcode)) return false;
  if (!isValidSpanishPostcode(destinationPostcode)) return false;
  return (
    originPostcode.startsWith(BARCELONA_PREFIX) && destinationPostcode.startsWith(BARCELONA_PREFIX)
  );
}
