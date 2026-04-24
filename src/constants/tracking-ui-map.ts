import { ShipmentStatus } from "@/types/enums";

// Collapses 7 raw statuses into 5 timeline buckets for smoother UX.

export const TrackingBucket = {
  AWAITING_DROPOFF: "awaiting_dropoff",
  COLLECTED_AT_ORIGIN: "collected_at_origin",
  IN_TRANSIT: "in_transit",
  AT_DESTINATION: "at_destination",
  DELIVERED: "delivered",
} as const;

export type TrackingBucket = (typeof TrackingBucket)[keyof typeof TrackingBucket];

/** Ordered list of buckets as they appear on the timeline (top → bottom). */
export const TRACKING_BUCKET_ORDER: TrackingBucket[] = [
  TrackingBucket.AWAITING_DROPOFF,
  TrackingBucket.COLLECTED_AT_ORIGIN,
  TrackingBucket.IN_TRANSIT,
  TrackingBucket.AT_DESTINATION,
  TrackingBucket.DELIVERED,
];

export const STATUS_TO_BUCKET: Record<string, TrackingBucket> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: TrackingBucket.AWAITING_DROPOFF,
  [ShipmentStatus.WAITING_AT_ORIGIN]: TrackingBucket.AWAITING_DROPOFF,
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: TrackingBucket.COLLECTED_AT_ORIGIN,
  [ShipmentStatus.IN_TRANSIT]: TrackingBucket.IN_TRANSIT,
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: TrackingBucket.AT_DESTINATION,
  [ShipmentStatus.READY_FOR_PICKUP]: TrackingBucket.AT_DESTINATION,
  [ShipmentStatus.DELIVERED]: TrackingBucket.DELIVERED,
};

export const BUCKET_LABEL_KEYS: Record<TrackingBucket, string> = {
  [TrackingBucket.AWAITING_DROPOFF]: "trackingBucket.awaiting_dropoff",
  [TrackingBucket.COLLECTED_AT_ORIGIN]: "trackingBucket.collected_at_origin",
  [TrackingBucket.IN_TRANSIT]: "trackingBucket.in_transit",
  [TrackingBucket.AT_DESTINATION]: "trackingBucket.at_destination",
  [TrackingBucket.DELIVERED]: "trackingBucket.delivered",
};

/**
 * Returns the visual state of a bucket relative to the shipment's current
 * status: past buckets are "done", the current bucket is "active", future
 * buckets are "upcoming". Consumed by the timeline renderer on the tracking
 * page.
 */
export type BucketState = "done" | "active" | "upcoming";

export function getBucketState(bucket: TrackingBucket, currentStatus: string): BucketState {
  const currentBucket = STATUS_TO_BUCKET[currentStatus];
  if (!currentBucket) return "upcoming";
  const currentIndex = TRACKING_BUCKET_ORDER.indexOf(currentBucket);
  const bucketIndex = TRACKING_BUCKET_ORDER.indexOf(bucket);
  if (bucketIndex < currentIndex) return "done";
  if (bucketIndex === currentIndex) return "active";
  return "upcoming";
}
