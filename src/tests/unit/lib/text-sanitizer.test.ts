import { describe, it, expect } from "vitest";
import { sanitizeUntrustedText, normalizeTitleForComparison } from "@/lib/text-sanitizer";

describe("sanitizeUntrustedText", () => {
  it("strips script tags and executable JavaScript", () => {
    const raw = "<script>evilFunction('xss')</script>Flash flood advisory in <b>Kathmandu</b>";
    const cleaned = sanitizeUntrustedText(raw);
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).not.toContain("evilFunction");
    expect(cleaned).toContain("Flash flood advisory in Kathmandu");
  });

  it("decodes HTML entities and normalizes whitespace", () => {
    const raw = "Storm &amp; Heavy Rain &mdash; Mumbai &lt;Alert&gt; &quot;High Risk&quot;";
    const cleaned = sanitizeUntrustedText(raw);
    expect(cleaned).toBe('Storm & Heavy Rain — Mumbai <Alert> "High Risk"');
  });

  it("handles null or undefined input safely", () => {
    expect(sanitizeUntrustedText(null)).toBe("");
    expect(sanitizeUntrustedText(undefined)).toBe("");
    expect(sanitizeUntrustedText("")).toBe("");
  });
});

describe("normalizeTitleForComparison", () => {
  it("strips punctuation and lowercases for token matching", () => {
    const title = "Cyclone Warning: Red Alert for Odisha, India!";
    expect(normalizeTitleForComparison(title)).toBe("cyclone warning red alert for odisha india");
  });
});
