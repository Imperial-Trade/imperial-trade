import { supabase } from '@/integrations/supabase/client';

/**
 * Global UI Activity Manager - Singleton
 * 
 * Centralizes UI activity registration across all components to prevent
 * duplicate intervals and excessive backend calls.
 * 
 * Key Features:
 * - Single 30-second registration interval for entire app
 * - Automatic symbol deduplication and aggregation
 * - Lifecycle management (starts when first subscriber, stops when last unsubscribes)
 * - Thread-safe subscription management
 */
class GlobalUIActivityManager {
  private static instance: GlobalUIActivityManager;
  private subscribers: Map<string, string[]> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string = '';
  private userId: string | null = null;
  private lastRegistrationTime: number = 0;
  private isRegistering: boolean = false;

  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  public static getInstance(): GlobalUIActivityManager {
    if (!GlobalUIActivityManager.instance) {
      GlobalUIActivityManager.instance = new GlobalUIActivityManager();
    }
    return GlobalUIActivityManager.instance;
  }

  private getOrCreateSessionId(): string {
    try {
      const existing = sessionStorage.getItem('ui-session-id');
      if (existing) return existing;
      const newId = `ui-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      sessionStorage.setItem('ui-session-id', newId);
      return newId;
    } catch {
      return `ui-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }
  }

  /**
   * Subscribe a component to global activity management
   * @param componentId Unique identifier for the component
   * @param symbols Array of symbols this component is tracking
   * @param userId User ID for authentication
   */
  public subscribe(componentId: string, symbols: string[], userId: string | null): void {
    if (!userId) {
      console.warn('GlobalUIActivityManager: Cannot subscribe without user ID');
      return;
    }

    this.userId = userId;
    this.subscribers.set(componentId, symbols);

    console.log(`📡 GlobalUIActivityManager: Subscribed "${componentId}" with ${symbols.length} symbols`);
    console.log(`   Total subscribers: ${this.subscribers.size}`);

    // Start interval if this is the first subscriber
    if (this.subscribers.size === 1 && !this.intervalId) {
      this.startInterval();
    }
  }

  /**
   * Unsubscribe a component from global activity management
   * @param componentId Unique identifier for the component
   */
  public unsubscribe(componentId: string): void {
    const hadSubscriber = this.subscribers.has(componentId);
    this.subscribers.delete(componentId);

    if (hadSubscriber) {
      console.log(`📡 GlobalUIActivityManager: Unsubscribed "${componentId}"`);
      console.log(`   Remaining subscribers: ${this.subscribers.size}`);
    }

    // Stop interval if no more subscribers
    if (this.subscribers.size === 0 && this.intervalId) {
      this.stopInterval();
    }
  }

  /**
   * Get all unique symbols from all subscribers
   */
  private getAllSymbols(): string[] {
    const allSymbols = new Set<string>();
    for (const symbols of this.subscribers.values()) {
      symbols.forEach(symbol => {
        if (symbol && symbol.trim().length > 0) {
          allSymbols.add(symbol.trim().toUpperCase());
        }
      });
    }
    return Array.from(allSymbols);
  }

  /**
   * Register UI activity with backend
   */
  private async registerActivity(): Promise<void> {
    // Prevent concurrent registrations
    if (this.isRegistering) {
      console.log('📡 GlobalUIActivityManager: Registration already in progress, skipping');
      return;
    }

    // Rate limiting: minimum 5 seconds between registrations
    const now = Date.now();
    if (now - this.lastRegistrationTime < 5000) {
      console.log('📡 GlobalUIActivityManager: Rate limited, skipping registration');
      return;
    }

    // Skip if no user ID
    if (!this.userId || this.userId.length === 0) {
      console.log('📡 GlobalUIActivityManager: No user ID, skipping registration');
      return;
    }

    // Skip if no subscribers
    if (this.subscribers.size === 0) {
      console.log('📡 GlobalUIActivityManager: No subscribers, skipping registration');
      return;
    }

    this.isRegistering = true;

    try {
      const symbols = this.getAllSymbols();
      
      console.log('📡 GlobalUIActivityManager: Registering activity', {
        sessionId: this.sessionId,
        userId: this.userId,
        symbols: symbols,
        subscriberCount: this.subscribers.size,
        timestamp: new Date().toISOString()
      });

      await supabase.rpc('register_ui_activity_enhanced', {
        p_session_id: this.sessionId,
        p_user_id: this.userId,
        p_symbols: symbols.length > 0 ? symbols : []
      });

      this.lastRegistrationTime = now;
      console.log('✅ GlobalUIActivityManager: Registration successful');

    } catch (error: any) {
      // Silently handle expected errors
      if (error?.code === '23503' || error?.code === 'PGRST204') {
        return;
      }

      console.error('❌ GlobalUIActivityManager: Registration failed', {
        error: error?.message || 'Unknown error',
        code: error?.code,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Start the 30-second registration interval
   */
  private startInterval(): void {
    if (this.intervalId) {
      console.warn('GlobalUIActivityManager: Interval already running');
      return;
    }

    console.log('🚀 GlobalUIActivityManager: Starting 30-second registration interval');

    // Register immediately on start
    this.registerActivity();

    // Then register every 30 seconds
    this.intervalId = setInterval(() => {
      this.registerActivity();
    }, 30 * 1000);
  }

  /**
   * Stop the registration interval
   */
  private stopInterval(): void {
    if (!this.intervalId) {
      return;
    }

    console.log('🛑 GlobalUIActivityManager: Stopping registration interval');
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /**
   * Manual registration trigger (for user interactions)
   */
  public async triggerManualRegistration(): Promise<void> {
    await this.registerActivity();
  }

  /**
   * Get current manager status (for debugging)
   */
  public getStatus() {
    return {
      subscriberCount: this.subscribers.size,
      subscribers: Array.from(this.subscribers.keys()),
      isActive: this.intervalId !== null,
      sessionId: this.sessionId,
      userId: this.userId,
      totalSymbols: this.getAllSymbols().length,
      lastRegistration: this.lastRegistrationTime
    };
  }
}

// Export singleton instance
export const globalUIActivityManager = GlobalUIActivityManager.getInstance();
