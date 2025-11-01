/**
 * 🔥 SIGNAL CACHE MANAGER: Flicker prevention for closed signals during WebSocket updates
 * 
 * PURPOSE CHANGE: No longer used for hiding closed signals from users.
 * Now only prevents brief reappearance flicker during real-time WebSocket updates.
 * 
 * - CLOSED_SIGNAL_TTL: Reduced to 10 seconds (flicker prevention only)
 * - Used only in handleRealtimeUpdate(), NOT in refreshSignals()
 * - Database 1-hour window handles user-facing closed signal filtering
 */

interface CachedSignal {
  id: string;
  status: string;
  closedAt?: string;
  lastSeen: number;
}

class SignalCacheManager {
  private closedSignalsCache = new Map<string, CachedSignal>();
  private readonly CLOSED_SIGNAL_TTL = 10 * 1000; // 10 seconds - only for flicker prevention
  private readonly CLEANUP_INTERVAL = 30 * 1000; // 30 seconds

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