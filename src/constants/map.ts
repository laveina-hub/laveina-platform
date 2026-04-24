export const SPAIN_CENTER = { lat: 40.4168, lng: -3.7038 } as const; // Madrid
export const SPAIN_ZOOM = 6;

export const BARCELONA_CENTER = { lat: 41.3874, lng: 2.1686 } as const;
export const BARCELONA_ZOOM = 12;

/** Enforced after fitBounds so same-postcode pins don't collapse city-wide. */
export const MIN_CLUSTER_ZOOM = 15;

export const SELECTED_POINT_ZOOM = 17;

/** ISO 3166-1 alpha-2 for Google Maps region biasing. */
export const MAP_REGION = "ES" as const;
