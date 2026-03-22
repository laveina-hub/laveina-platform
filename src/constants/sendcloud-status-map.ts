// SendCloud status IDs → Laveina status. Unmapped = no-op.
// Ref: https://support.sendcloud.com/hc/en-us/articles/360057461691

import { ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

// null = acknowledge but don't update status
export const SENDCLOUD_STATUS_MAP: Record<number, ShipmentStatusType | null> = {
  1: null, // announced
  3: ShipmentStatus.IN_TRANSIT, // at sorting center
  11: ShipmentStatus.DELIVERED,
  12: null, // delivery attempt failed
  15: ShipmentStatus.IN_TRANSIT, // out for delivery
  22: ShipmentStatus.ARRIVED_AT_DESTINATION, // at pickup point
  80: ShipmentStatus.IN_TRANSIT, // picked up by carrier
  92: ShipmentStatus.IN_TRANSIT, // en route to sorting center
  93: ShipmentStatus.IN_TRANSIT, // picked up by SendCloud
  2000: null, // exception/return
};

export function mapSendcloudStatus(sendcloudStatusId: number): ShipmentStatusType | null {
  return SENDCLOUD_STATUS_MAP[sendcloudStatusId] ?? null;
}
