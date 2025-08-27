
// Mock Redis cache service for development
// In production, this would connect to actual Redis
export class RedisCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  read<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  write<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  getSignal(key: string): any | null {
    return this.read(key);
  }

  setSignal(key: string, data: any, ttlMs: number): void {
    this.write(key, data, ttlMs);
  }

  setPrice(symbol: string, price: number, ttlMs: number): void {
    this.write(`price:${symbol}`, price, ttlMs);
  }
}

export const redisCache = new RedisCache();
