import { supabase } from '@/integrations/supabase/client';

export interface NotificationRateLimit {
  signalId: string;
  userId: string;
  lastSentAt: Date;
  count: number;
}

export interface DuplicationCheckResult {
  shouldSend: boolean;
  reason?: string;
  rateLimited?: boolean;
  duplicate?: boolean;
}

class NotificationDuplicatePreventionService {
  private rateLimitCache = new Map<string, NotificationRateLimit>();
  private requestCache = new Map<string, Date>();
  private readonly RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_NOTIFICATIONS_PER_WINDOW = 1;
  private readonly REQUEST_DEDUP_WINDOW_MS = 30 * 1000; // 30 seconds

  /**
   * Check if notification should be sent based on rate limiting and deduplication
   */
  async checkNotificationEligibility(
    signalId: string,
    userId: string,
    notificationType: string,
    changeTypes: string[] = []
  ): Promise<DuplicationCheckResult> {
    try {
      // 1. Check for empty or invalid change types (phantom notifications)
      if (this.isPhantomNotification(changeTypes)) {
        return {
          shouldSend: false,
          reason: 'Phantom notification detected - no actual changes',
          duplicate: true
        };
      }

      // 2. Check circuit breaker (database-level cooldown)
      const circuitBreakerResult = await this.checkCircuitBreaker(signalId, userId);
      if (!circuitBreakerResult.shouldSend) {
        return circuitBreakerResult;
      }

      // 3. Check local rate limiting cache
      const rateLimitResult = this.checkRateLimit(signalId, userId);
      if (!rateLimitResult.shouldSend) {
        return rateLimitResult;
      }

      // 4. Check for request deduplication
      const requestKey = `${signalId}_${userId}_${notificationType}`;
      const dedupResult = this.checkRequestDeduplication(requestKey);
      if (!dedupResult.shouldSend) {
        return dedupResult;
      }

      // All checks passed - allow notification
      this.updateRateLimit(signalId, userId);
      this.updateRequestCache(requestKey);
      
      return { shouldSend: true };

    } catch (error) {
      console.error('Error checking notification eligibility:', error);
      // Fail safe - allow notification if checks fail
      return { shouldSend: true };
    }
  }

  /**
   * Check database-level circuit breaker
   */
  private async checkCircuitBreaker(signalId: string, userId: string): Promise<DuplicationCheckResult> {
    try {
      const { data, error } = await supabase
        .rpc('check_notification_circuit_breaker', {
          p_signal_id: signalId,
          p_user_id: userId,
          p_cooldown_minutes: 5
        });

      if (error) throw error;

      if (!data) {
        return {
          shouldSend: false,
          reason: 'Circuit breaker active - cooldown period not elapsed',
          rateLimited: true
        };
      }

      return { shouldSend: true };
    } catch (error) {
      console.error('Circuit breaker check failed:', error);
      return { shouldSend: true }; // Fail safe
    }
  }

  /**
   * Check local rate limiting cache
   */
  private checkRateLimit(signalId: string, userId: string): DuplicationCheckResult {
    const key = `${signalId}_${userId}`;
    const cached = this.rateLimitCache.get(key);

    if (!cached) {
      return { shouldSend: true };
    }

    const timeElapsed = Date.now() - cached.lastSentAt.getTime();
    
    if (timeElapsed < this.RATE_LIMIT_WINDOW_MS) {
      if (cached.count >= this.MAX_NOTIFICATIONS_PER_WINDOW) {
        return {
          shouldSend: false,
          reason: `Rate limited - ${cached.count} notifications sent in last ${this.RATE_LIMIT_WINDOW_MS / 1000}s`,
          rateLimited: true
        };
      }
    }

    return { shouldSend: true };
  }

  /**
   * Check request-level deduplication
   */
  private checkRequestDeduplication(requestKey: string): DuplicationCheckResult {
    const lastRequest = this.requestCache.get(requestKey);
    
    if (lastRequest) {
      const timeElapsed = Date.now() - lastRequest.getTime();
      
      if (timeElapsed < this.REQUEST_DEDUP_WINDOW_MS) {
        return {
          shouldSend: false,
          reason: `Duplicate request detected within ${this.REQUEST_DEDUP_WINDOW_MS / 1000}s window`,
          duplicate: true
        };
      }
    }

    return { shouldSend: true };
  }

  /**
   * Check if notification is phantom (no actual changes)
   */
  private isPhantomNotification(changeTypes: string[]): boolean {
    if (!changeTypes || changeTypes.length === 0) {
      return true;
    }

    // Filter out non-significant change types
    const significantChanges = changeTypes.filter(type => 
      type !== 'notes_updated' && 
      type !== 'metadata_updated' &&
      type !== 'timestamp_updated'
    );

    return significantChanges.length === 0;
  }

  /**
   * Update rate limit cache
   */
  private updateRateLimit(signalId: string, userId: string): void {
    const key = `${signalId}_${userId}`;
    const cached = this.rateLimitCache.get(key);
    
    if (cached && (Date.now() - cached.lastSentAt.getTime()) < this.RATE_LIMIT_WINDOW_MS) {
      // Within window, increment count
      cached.count += 1;
      cached.lastSentAt = new Date();
    } else {
      // New window or first notification
      this.rateLimitCache.set(key, {
        signalId,
        userId,
        lastSentAt: new Date(),
        count: 1
      });
    }
  }

  /**
   * Update request deduplication cache
   */
  private updateRequestCache(requestKey: string): void {
    this.requestCache.set(requestKey, new Date());
  }

  /**
   * Clean expired cache entries
   */
  public cleanupCache(): void {
    const now = Date.now();

    // Clean rate limit cache
    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (now - entry.lastSentAt.getTime() > this.RATE_LIMIT_WINDOW_MS * 2) {
        this.rateLimitCache.delete(key);
      }
    }

    // Clean request cache
    for (const [key, timestamp] of this.requestCache.entries()) {
      if (now - timestamp.getTime() > this.REQUEST_DEDUP_WINDOW_MS * 2) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Get current cache statistics
   */
  public getCacheStats() {
    return {
      rateLimitEntries: this.rateLimitCache.size,
      requestCacheEntries: this.requestCache.size,
      rateLimitWindow: this.RATE_LIMIT_WINDOW_MS / 1000,
      maxNotificationsPerWindow: this.MAX_NOTIFICATIONS_PER_WINDOW,
      requestDedupWindow: this.REQUEST_DEDUP_WINDOW_MS / 1000
    };
  }

  /**
   * Force clear all caches (emergency use)
   */
  public emergencyClearCache(): void {
    this.rateLimitCache.clear();
    this.requestCache.clear();
    console.log('🚨 Emergency cache clear executed');
  }

  /**
   * Get notification health metrics
   */
  async getHealthMetrics() {
    try {
      const { data, error } = await supabase
        .rpc('get_notification_health_metrics', { p_hours: 1 });

      if (error) throw error;

      return {
        healthMetrics: data || {},
        cacheStats: this.getCacheStats()
      };
    } catch (error) {
      console.error('Failed to get health metrics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationDuplicatePreventionService = new NotificationDuplicatePreventionService();

// Auto-cleanup every 5 minutes
setInterval(() => {
  notificationDuplicatePreventionService.cleanupCache();
}, 5 * 60 * 1000);