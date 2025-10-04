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
  
  // 🔥 PRIORITY 1: Idle Detection - Stop registration after 5 minutes of no user interaction
  private lastInteractionTime: number = Date.now();
  private readonly IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  private isIdle: boolean = false;
  private eventListenersAttached: boolean = false;

  // 🔥 PRIORITY 2: Passive Viewing Mode - Different intervals for passive vs active users
  private passiveViewingMode: boolean = false;
  private readonly PASSIVE_VIEWING_INTERVAL_MS = 120000; // 2 minutes for passive viewing
  private readonly REGISTRATION_INTERVAL_MS = 30000; // 30 seconds for active users

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
   * Record user interaction to reset idle timer
   */
  private recordInteraction = (): void => {
    const wasIdle = this.isIdle;
    this.lastInteractionTime = Date.now();
    this.isIdle = false;
    
    if (wasIdle) {
      console.log('👤 User active again - resuming UI activity registration');
    }
  };

  /**
   * Attach global event listeners for idle detection
   */
  private attachEventListeners(): void {
    if (this.eventListenersAttached) return;
    
    const events = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, this.recordInteraction, { passive: true });
    });
    
    this.eventListenersAttached = true;
    console.log('👂 Idle detection listeners attached');
  }

  /**
   * Remove global event listeners
   */
  private removeEventListeners(): void {
    if (!this.eventListenersAttached) return;
    
    const events = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.removeEventListener(event, this.recordInteraction);
    });
    
    this.eventListenersAttached = false;
    console.log('👋 Idle detection listeners removed');
  }

  /**
   * Set whether user is actively trading or passively viewing
   */
  public setPassiveViewingMode(isPassive: boolean): void {
    if (this.passiveViewingMode === isPassive) return;
    
    this.passiveViewingMode = isPassive;
    
    console.log(`📺 GlobalUIActivityManager: ${isPassive ? 'PASSIVE' : 'ACTIVE'} viewing mode`);
    
    // Restart interval with new duration if already running
    if (this.intervalId !== null) {
      this.stopInterval();
      this.startInterval();
    }
  }

  /**
   * Subscribe a component to global activity management
   * @param componentId Unique identifier for the component
   * @param symbols Array of symbols this component is tracking
   * @param userId User ID for authentication
   * @param isPassiveViewing Whether the user is passively viewing (reduces registration frequency)
   */
  public subscribe(componentId: string, symbols: string[], userId: string | null, isPassiveViewing: boolean = false): void {
    if (!userId) {
      console.warn('GlobalUIActivityManager: Cannot subscribe without user ID');
      return;
    }

    this.userId = userId;
    this.passiveViewingMode = isPassiveViewing;
    this.subscribers.set(componentId, symbols);

    console.log(`📡 GlobalUIActivityManager: Subscribed "${componentId}" with ${symbols.length} symbols`);
    console.log(`   Total subscribers: ${this.subscribers.size}`);

    // Start interval and attach event listeners if this is the first subscriber
    if (this.subscribers.size === 1 && !this.intervalId) {
      this.attachEventListeners();
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

    // Stop interval and remove event listeners if no more subscribers
    if (this.subscribers.size === 0 && this.intervalId) {
      this.stopInterval();
      this.removeEventListeners();
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
    // 🔥 PRIORITY 1: Check idle state - skip registration if user has been idle for 5+ minutes
    const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
    if (timeSinceLastInteraction > this.IDLE_THRESHOLD_MS) {
      if (!this.isIdle) {
        this.isIdle = true;
        console.log('💤 User idle for 5+ minutes - pausing UI activity registration');
      }
      return;
    }

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
   * Start the registration interval (30s for active, 2min for passive)
   */
  private startInterval(): void {
    if (this.intervalId) {
      console.warn('GlobalUIActivityManager: Interval already running');
      return;
    }

    const intervalDuration = this.passiveViewingMode 
      ? this.PASSIVE_VIEWING_INTERVAL_MS 
      : this.REGISTRATION_INTERVAL_MS;

    console.log(`🚀 GlobalUIActivityManager: Starting registration interval (${intervalDuration / 1000}s - ${this.passiveViewingMode ? 'PASSIVE' : 'ACTIVE'} mode)`);

    // Register immediately on start
    this.registerActivity();

    // Then register at appropriate interval
    this.intervalId = setInterval(() => {
      this.registerActivity();
    }, intervalDuration);
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
