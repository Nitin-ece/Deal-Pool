/**
 * Security & Sanitization Utilities for Frontend Data Display & Input Validation.
 * Protects against XSS, file injection, javascript: pseudo-protocol URIs, and unsafe payloads.
 */

const ALLOWED_URL_SCHEMES = ["http:", "https:"];

/**
 * Sanitizes a URL string for use in src/href attributes.
 * Returns null or a safe fallback if the URL is invalid or uses an unsafe scheme (e.g. javascript:, data:, file:).
 */
export function sanitizeUrl(url: string | null | undefined, fallback: string = ""): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      console.warn("Blocked potentially unsafe URL protocol:", parsed.protocol);
      return fallback;
    }
    return parsed.href;
  } catch {
    // If URL parsing fails and it doesn't look like a valid relative URL
    if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
      return trimmed;
    }
    return fallback;
  }
}

/**
 * Escapes HTML characters in text to prevent XSS injection in raw contexts.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates if an image URL is safe and well-formed.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
