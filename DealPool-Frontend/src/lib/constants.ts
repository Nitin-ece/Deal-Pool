/**
 * Shared frontend constants — single source of truth for values
 * that were previously duplicated across multiple slices/components.
 */

/** Default search radius in kilometers. Must be one of RADIUS_OPTIONS in RadiusSelector. */
export const DEFAULT_RADIUS_KM = 10;

/** Default fallback location (Connaught Place, New Delhi). */
export const DEFAULT_LOCATION = {
  lat: 28.6304,
  lng: 77.2177,
  address: "Connaught Place, New Delhi",
  cityName: "New Delhi",
} as const;
