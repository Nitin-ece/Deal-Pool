/** Normalize API / unknown failures into a single user-facing string. */
export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err == null) return fallback;
  if (typeof err === "string") {
    const trimmed = err.trim();
    return trimmed || fallback;
  }
  if (typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }
    if (record.error && typeof record.error === "object") {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message.trim();
      }
    }
    if (typeof record.code === "string" && record.code.trim()) {
      return `${record.code}: ${fallback}`;
    }
  }
  return fallback;
}

export function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = String((err as { code?: string }).code || "").toUpperCase();
  return code === "NOT_FOUND" || code === "PROFILE_NOT_FOUND" || code.includes("404");
}

export function isBackendGapError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = String((err as { code?: string }).code || "").toUpperCase();
  const message = String((err as { message?: string }).message || "").toLowerCase();
  return (
    code === "ERR_BAD_REQUEST" ||
    code === "ERR_NETWORK" ||
    code === "REQUEST_FAILED" ||
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("cannot get") ||
    message.includes("cannot post")
  );
}
