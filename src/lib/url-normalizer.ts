/**
 * Canonical URL normalizer.
 * Strips tracking parameters, hash fragments, and redundant trailing slashes
 * to enable deterministic article deduplication.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "ref",
  "source",
  "ocid",
  "ncid",
  "cmp",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
]);

/**
 * Normalizes a URL string into a canonical representation.
 * Returns the original string if URL parsing fails.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return "";
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip hash fragment
    parsed.hash = "";

    // Filter out tracking parameters
    const cleanParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (!TRACKING_PARAMS.has(key.toLowerCase()) && !key.toLowerCase().startsWith("utm_")) {
        const val = parsed.searchParams.get(key);
        if (val !== null) {
          cleanParams.set(key, val);
        }
      }
    }

    parsed.search = cleanParams.toString();

    // Remove trailing slash from pathname unless it is root
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    // Fallback for malformed URLs
    return rawUrl.trim().split("#")[0]?.replace(/\/+$/, "") || rawUrl.trim();
  }
}
