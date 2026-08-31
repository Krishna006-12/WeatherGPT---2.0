/**
 * Untrusted text sanitizer.
 * Safely strips HTML markup, script tags, control characters,
 * and decodes basic entities to ensure external feed data cannot
 * execute or inject malicious payloads.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
};

/**
 * Strips HTML tags, script elements, and control characters from untrusted input.
 */
export function sanitizeUntrustedText(rawText?: string | null): string {
  if (!rawText) {
    return "";
  }

  let text = rawText;

  // Remove script and style tags along with their inner contents
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove all other HTML/XML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replaceAll(entity, char);
  }

  // Remove numeric entities (e.g. &#160; or &#x20;)
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Remove control characters (except standard newlines and tabs)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Collapse multiple whitespaces into a single space
  text = text.replace(/[ \t\f]+/g, " ");
  text = text.replace(/\n\s*\n+/g, "\n\n");

  return text.trim();
}

/**
 * Normalizes title text for similarity matching and token comparison.
 * Lowercases, strips punctuation, and collapses spaces.
 */
export function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
