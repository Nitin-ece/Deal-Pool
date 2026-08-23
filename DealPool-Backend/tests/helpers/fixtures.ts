/**
 * Shared test fixtures — centralized values to reduce drift across test files.
 */

/** Standard test password used across all test files. */
export const TEST_PASSWORD = "TestPassword123!";

/** Alternative test password for wallet/secondary tests. */
export const TEST_PASSWORD_ALT = "WalletPassword123!";

/** Default test coordinates (San Francisco). */
export const TEST_COORDS = {
  lat: 37.7749,
  lng: -122.4194,
} as const;

/** Secondary test coordinates (nearby, for radius tests). */
export const TEST_COORDS_NEARBY = {
  lat: 37.7849,
  lng: -122.4094,
} as const;

/** Generate a unique, timestamped test email to avoid collisions. */
export const testEmail = (prefix: string = "test"): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

/** Default test radius in km. */
export const TEST_RADIUS_KM = 10;
