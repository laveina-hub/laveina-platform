// Both postcodes "08xxx" → internal (Barcelona), otherwise → SendCloud.

import { DeliveryMode } from "@/types/enums";

const BARCELONA_PREFIX = "08";

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

function isValidSpanishPostcode(postcode: string): boolean {
  return /^[0-9]{5}$/.test(postcode);
}

export function isInternalRoute(result: RoutingResult): result is { mode: "internal" } {
  return result.mode === "internal";
}

export function isSendcloudRoute(result: RoutingResult): result is { mode: "sendcloud" } {
  return result.mode === "sendcloud";
}
