import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "@/lib/cache";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets and gets values", () => {
    const cache = new MemoryCache<string>({ defaultTtlMs: 1000 });
    cache.set("key1", "val1");
    expect(cache.get("key1")).toBe("val1");
    expect(cache.has("key1")).toBe(true);
    expect(cache.size).toBe(1);
  });

  it("expires entries based on TTL", () => {
    const cache = new MemoryCache<string>({ defaultTtlMs: 1000 });
    cache.set("key1", "val1");
    
    vi.advanceTimersByTime(500);
    expect(cache.get("key1")).toBe("val1");

    vi.advanceTimersByTime(501);
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.has("key1")).toBe(false);
  });

  it("evicts oldest entry when maxEntries is exceeded", () => {
    const cache = new MemoryCache<string>({ defaultTtlMs: 1000, maxEntries: 2 });
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    expect(cache.size).toBe(2);

    cache.set("k3", "v3");
    expect(cache.size).toBe(2);
    expect(cache.has("k1")).toBe(false);
    expect(cache.has("k2")).toBe(true);
    expect(cache.has("k3")).toBe(true);
  });

  it("deletes and clears", () => {
    const cache = new MemoryCache<string>({ defaultTtlMs: 1000 });
    cache.set("k1", "v1");
    cache.set("k2", "v2");

    cache.delete("k1");
    expect(cache.has("k1")).toBe(false);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
