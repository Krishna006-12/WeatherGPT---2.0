interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly defaultTtlMs: number;
  private readonly maxEntries?: number;

  constructor(options: { defaultTtlMs: number; maxEntries?: number }) {
    this.cache = new Map();
    this.defaultTtlMs = options.defaultTtlMs;
    this.maxEntries = options.maxEntries;
  }

  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  public set(key: string, value: T, ttlMs?: number): void {
    if (this.maxEntries && this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      // Evict oldest (Map maintains insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const ttl = ttlMs ?? this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public get size(): number {
    return this.cache.size;
  }
}
