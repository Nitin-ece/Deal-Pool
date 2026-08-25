/**
 * Shared frontend constants — single source of truth for values
 * that were previously duplicated across multiple slices/components.
 */

/** Default search radius in kilometers. Must be one of RADIUS_OPTIONS in RadiusSelector. */
export const DEFAULT_RADIUS_KM = 10;

/** Default empty location sentinel when user has not granted location permission. */
export const DEFAULT_LOCATION = {
  lat: 0,
  lng: 0,
  address: "",
  cityName: "",
} as const;
