interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class RecipeCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 1000 * 60 * 60; // 1 hour

  async getOrSet<T>(key: string, getter: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.timestamp > Date.now() - this.TTL) {
      return cached.value;
    }

    const value = await getter();
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  async getOrSetBatch<T>(
    keys: string[],
    batchGetter: (keys: string[]) => Promise<Map<string, T>>
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    // Check cache for each key
    for (const key of keys) {
      const cached = this.cache.get(key);
      if (cached && cached.timestamp > Date.now() - this.TTL) {
        result.set(key, cached.value);
      } else {
        missingKeys.push(key);
      }
    }

    // If we have missing keys, fetch them
    if (missingKeys.length > 0) {
      const newValues = await batchGetter(missingKeys);
      for (const [key, value] of newValues.entries()) {
        this.cache.set(key, { value, timestamp: Date.now() });
        result.set(key, value);
      }
    }

    return result;
  }
} 