import { isDevToolsEnabled } from '@/utils/featureFlags';

/**
 * Realtime Logger - Definitive paired SUBSCRIBE/UNSUBSCRIBE logging
 * 
 * CRITICAL: Every supabase.channel() call MUST use this logger to ensure
 * we can verify connection leaks are eliminated via log analysis.
 */

interface ChannelLogEntry {
  channelId: string;
  channelName: string;
  contextName: string;
  subscribeTime: number;
  unsubscribeTime?: number;
  isActive: boolean;
}

class RealtimeLogger {
  private channels = new Map<string, ChannelLogEntry>();
  private logPrefix = '📡 RT-LOG';

  /**
   * Log channel subscription - MUST be called for every supabase.channel().subscribe()
   */
  logSubscribe(channelId: string, channelName: string, contextName: string) {
    const entry: ChannelLogEntry = {
      channelId,
      channelName,
      contextName,
      subscribeTime: Date.now(),
      isActive: true
    };
    
    this.channels.set(channelId, entry);
    
    if (isDevToolsEnabled()) {
      console.log(`${this.logPrefix}: SUBSCRIBE [${channelId}] ${contextName} -> ${channelName}`);
    }
  }

  /**
   * Log channel unsubscription - MUST be called for every supabase.removeChannel()
   */
  logUnsubscribe(channelId: string, contextName: string) {
    const entry = this.channels.get(channelId);
    if (entry) {
      entry.unsubscribeTime = Date.now();
      entry.isActive = false;
      
      const duration = entry.unsubscribeTime - entry.subscribeTime;
      
      if (isDevToolsEnabled()) {
        console.log(`${this.logPrefix}: UNSUBSCRIBE [${channelId}] ${contextName} (${Math.round(duration/1000)}s)`);
      }
    } else {
      // Warning: Unsubscribe without matching subscribe
      if (isDevToolsEnabled()) {
        console.warn(`${this.logPrefix}: ORPHAN UNSUBSCRIBE [${channelId}] ${contextName} - no matching subscribe`);
      }
    }
  }

  /**
   * Get active channel count - useful for debugging
   */
  getActiveChannelCount(): number {
    return Array.from(this.channels.values()).filter(entry => entry.isActive).length;
  }

  /**
   * Get detailed active channels - for debugging connection leaks
   */
  getActiveChannels(): ChannelLogEntry[] {
    return Array.from(this.channels.values()).filter(entry => entry.isActive);
  }

  /**
   * Log current status - useful for mount/unmount debugging
   */
  logStatus(contextName: string) {
    const active = this.getActiveChannelCount();
    if (isDevToolsEnabled()) {
      console.log(`${this.logPrefix}: STATUS ${contextName} - ${active} active channels`);
    }
  }

  /**
   * Clear stale entries (older than 5 minutes)
   */
  cleanup() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [channelId, entry] of this.channels.entries()) {
      if (!entry.isActive && entry.unsubscribeTime && (now - entry.unsubscribeTime) > staleThreshold) {
        this.channels.delete(channelId);
      }
    }
  }
}

// Singleton instance for global use
export const realtimeLogger = new RealtimeLogger();

// Convenience function for generating deterministic channel IDs
export function generateChannelId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
}

// 🔥 DEV TOOL: Expose logger on window for debugging in development
if (typeof window !== 'undefined' && isDevToolsEnabled()) {
  (window as any).realtimeLogger = realtimeLogger;
}