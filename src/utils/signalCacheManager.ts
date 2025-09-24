/**
 * 🔥 SIGNAL CACHE MANAGER: Intelligent cache management for closed signals
 * Prevents closed signals from reappearing and optimizes memory usage
 */

interface CachedSignal {
  id: string;
  status: string;
  closedAt?: string;
  lastSeen: number;
}

class SignalCacheManager {
  private closedSignalsCache = new Map<string, CachedSignal>();
  private readonly CLOSED_SIGNAL_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Auto-cleanup old closed signals
    setInterval(() => {
      this.cleanupExpiredClosedSignals();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Mark a signal as closed and schedule its removal
   */
  markSignalClosed(signalId: string, closedAt: string = new Date().toISOString()) {
    this.closedSignalsCache.set(signalId, {
      id: signalId,
      status: 'closed',
      closedAt,
      lastSeen: Date.now()
    });

    // Auto-remove after TTL
    setTimeout(() => {
      this.closedSignalsCache.delete(signalId);
      console.log(`🧹 Auto-removed closed signal ${signalId} from cache`);
    }, this.CLOSED_SIGNAL_TTL);
  }

  /**
   * Check if a signal is in the closed cache and should be filtered out
   */
  isSignalExpiredClosed(signalId: string): boolean {
    const cached = this.closedSignalsCache.get(signalId);
    if (!cached) return false;
    
    const now = Date.now();
    const isExpired = (now - cached.lastSeen) > this.CLOSED_SIGNAL_TTL;
    
    if (isExpired) {
      this.closedSignalsCache.delete(signalId);
      return false;
    }
    
    return cached.status === 'closed';
  }

  /**
   * Filter out expired closed signals from a signal array
   */
  filterExpiredClosedSignals<T extends { id: string; status: string }>(signals: T[]): T[] {
    return signals.filter(signal => {
      // If signal is closed, check if it should be filtered out
      if (signal.status === 'closed') {
        const shouldFilter = this.isSignalExpiredClosed(signal.id);
        if (shouldFilter) {
          console.log(`🧹 Filtering out expired closed signal: ${signal.id}`);
          return false;
        }
        // Mark newly seen closed signals
        this.markSignalClosed(signal.id);
      }
      return true;
    });
  }

  /**
   * Clean up expired closed signals from cache
   */
  private cleanupExpiredClosedSignals() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [signalId, cached] of this.closedSignalsCache.entries()) {
      if ((now - cached.lastSeen) > this.CLOSED_SIGNAL_TTL) {
        this.closedSignalsCache.delete(signalId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired closed signals from cache`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      closedSignalsCount: this.closedSignalsCache.size,
      oldestClosedSignal: this.getOldestClosedSignal(),
      cacheSize: this.closedSignalsCache.size
    };
  }

  private getOldestClosedSignal() {
    let oldest = null;
    for (const cached of this.closedSignalsCache.values()) {
      if (!oldest || cached.lastSeen < oldest) {
        oldest = cached.lastSeen;
      }
    }
    return oldest ? new Date(oldest).toISOString() : null;
  }
}

// Export singleton instance
export const signalCacheManager = new SignalCacheManager();