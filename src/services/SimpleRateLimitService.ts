interface RateLimitData {
  count: number;
  windowStart: number;
  lastReset: number;
}

class SimpleRateLimitService {
  private static instance: SimpleRateLimitService;
  private storage = new Map<string, RateLimitData>();
  
  static getInstance(): SimpleRateLimitService {
    if (!SimpleRateLimitService.instance) {
      SimpleRateLimitService.instance = new SimpleRateLimitService();
    }
    return SimpleRateLimitService.instance;
  }

  private getKey(identifier: string, type: string): string {
    return `rate_limit_${type}_${identifier}`;
  }

  private isWindowExpired(data: RateLimitData, windowMs: number): boolean {
    return Date.now() - data.windowStart > windowMs;
  }

  canMakeRequest(
    identifier: string, 
    type: string, 
    maxRequests: number = 5, 
    windowMs: number = 15 * 60 * 1000 // 15 minutes default
  ): { allowed: boolean; resetTime: number; attemptsLeft: number } {
    const key = this.getKey(identifier, type);
    const now = Date.now();
    
    let data = this.storage.get(key);
    
    // Initialize if no data or window expired
    if (!data || this.isWindowExpired(data, windowMs)) {
      data = {
        count: 0,
        windowStart: now,
        lastReset: now,
      };
      this.storage.set(key, data);
    }

    const allowed = data.count < maxRequests;
    const resetTime = data.windowStart + windowMs;
    const attemptsLeft = Math.max(0, maxRequests - data.count);

    return {
      allowed,
      resetTime,
      attemptsLeft,
    };
  }

  recordAttempt(
    identifier: string, 
    type: string, 
    maxRequests: number = 5, 
    windowMs: number = 15 * 60 * 1000
  ): void {
    const key = this.getKey(identifier, type);
    const now = Date.now();
    
    let data = this.storage.get(key);
    
    if (!data || this.isWindowExpired(data, windowMs)) {
      data = {
        count: 1,
        windowStart: now,
        lastReset: now,
      };
    } else {
      data.count += 1;
    }
    
    this.storage.set(key, data);
  }

  getRemainingTime(
    identifier: string, 
    type: string, 
    windowMs: number = 15 * 60 * 1000
  ): number {
    const key = this.getKey(identifier, type);
    const data = this.storage.get(key);
    
    if (!data) return 0;
    
    const resetTime = data.windowStart + windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  // Clean up old entries to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, data] of this.storage.entries()) {
      if (now - data.lastReset > oneHour) {
        this.storage.delete(key);
      }
    }
  }
}

export const simpleRateLimitService = SimpleRateLimitService.getInstance();

// Clean up every 30 minutes
setInterval(() => {
  simpleRateLimitService.cleanup();
}, 30 * 60 * 1000);