/**
 * Emergency Realtime Circuit Breaker
 * Implements aggressive cost protection to prevent message explosion
 */

interface EmergencyMetrics {
  hourlyMessages: number;
  dailyMessages: number;
  consecutiveFailures: number;
  lastResetTime: number;
  emergencyModeActive: boolean;
  costExceeded: boolean;
}

class EmergencyRealtimeBreaker {
  private static instance: EmergencyRealtimeBreaker;
  private metrics: EmergencyMetrics = {
    hourlyMessages: 0,
    dailyMessages: 0,
    consecutiveFailures: 0,
    lastResetTime: Date.now(),
    emergencyModeActive: false,
    costExceeded: false
  };

  // 🚨 PER-TYPE LIMITS: Different caps for DB vs price updates (per user/session)
  private readonly HOURLY_LIMITS: Record<string, number> = {
    db_change: 600,             // ~10/min per user is plenty
    price_update: 18000,        // up to 5 per second
    price_update_v3: 18000,     // up to 5 per second
    default: 1000               // fallback for unknown types
  };
  private readonly DAILY_MESSAGE_LIMIT = 20000; // global soft cap
  private readonly COST_LIMIT_USD = 1.00; // soft cost cap (not enforced here)
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly EMERGENCY_COOLDOWN = 300000; // 5 minutes cooldown
  
  // 🚀 SLIDING WINDOWS PER TYPE
  private readonly messageWindows: Map<string, number[]> = new Map();

  private constructor() {
    this.startHourlyReset();
    console.log('🚨 Emergency Realtime Breaker initialized - Per-type rate limits active');
  }

  static getInstance(): EmergencyRealtimeBreaker {
    if (!EmergencyRealtimeBreaker.instance) {
      EmergencyRealtimeBreaker.instance = new EmergencyRealtimeBreaker();
    }
    return EmergencyRealtimeBreaker.instance;
  }

  private startHourlyReset(): void {
    setInterval(() => {
      this.metrics.hourlyMessages = 0;
      
      // Daily reset at midnight
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.metrics.dailyMessages = 0;
        console.log('📊 Emergency Breaker: Daily metrics reset');
      }
    }, 3600000); // Every hour
  }

  // 🚀 OPTIMIZED: Keep only global/emergency checks here; per-type rate limit happens in recordMessage
  canAllowRealtimeOperation(operationType: 'connection' | 'message' | 'subscription'): boolean {
    // Emergency mode blocks all operations
    if (this.metrics.emergencyModeActive) {
      if (Date.now() - this.metrics.lastResetTime < this.EMERGENCY_COOLDOWN) {
        return false;
      } else {
        // Try to exit emergency mode after cooldown
        this.exitEmergencyMode();
      }
    }

    // Global soft daily cap
    if (this.metrics.dailyMessages >= this.DAILY_MESSAGE_LIMIT) {
      this.activateEmergencyMode('Daily message limit exceeded');
      return false;
    }

    if (this.metrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.activateEmergencyMode('Too many consecutive failures');
      return false;
    }

    return true;
  }

  // 🚀 OPTIMIZED: Per-type sliding window rate limiting for precise control
  recordMessage(messageType?: string): boolean {
    if (!this.canAllowRealtimeOperation('message')) {
      console.warn(`🚨 Emergency Breaker: Message blocked (${messageType})`);
      return false;
    }

    const type = messageType || 'default';
    const window = this.messageWindows.get(type) || [];
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Clean old timestamps
    const pruned = window.filter(ts => ts >= oneHourAgo);
    const limit = this.HOURLY_LIMITS[type] ?? this.HOURLY_LIMITS.default;

    if (pruned.length >= limit) {
      // Do NOT trigger global emergency for high-frequency price updates; just drop
      if (type.startsWith('price_update')) {
        return false;
      }
      // For DB changes, activate emergency to protect costs
      this.activateEmergencyMode(`Hourly limit exceeded for ${type}`);
      return false;
    }

    pruned.push(now);
    this.messageWindows.set(type, pruned);

    // Update aggregate metrics
    this.metrics.hourlyMessages = Array.from(this.messageWindows.values()).reduce((sum, arr) => sum + arr.length, 0);
    this.metrics.dailyMessages++;
    this.metrics.consecutiveFailures = 0;

    // Soft warning as we approach limits (non-blocking)
    if (pruned.length >= limit * 0.9 && type !== 'price_update' && type !== 'price_update_v3') {
      console.warn(`⚠️ Emergency Breaker: Approaching hourly limit for ${type} (${pruned.length}/${limit})`);
    }

    return true;
  }

  /**
   * Record a failure
   */
  recordFailure(reason: string): void {
    this.metrics.consecutiveFailures++;
    console.warn(`🚨 Emergency Breaker: Failure recorded (${this.metrics.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}): ${reason}`);

    if (this.metrics.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.activateEmergencyMode(`Too many failures: ${reason}`);
    }
  }

  /**
   * Activate emergency mode
   */
  private activateEmergencyMode(reason: string): void {
    this.metrics.emergencyModeActive = true;
    this.metrics.lastResetTime = Date.now();
    console.error(`🚨 EMERGENCY MODE ACTIVATED: ${reason}`);
    console.error(`📊 Current metrics:`, {
      hourly: this.metrics.hourlyMessages,
      daily: this.metrics.dailyMessages,
      failures: this.metrics.consecutiveFailures
    });

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('realtime-emergency-mode', { 
      detail: { reason, metrics: this.metrics } 
    }));
  }

  /**
   * Exit emergency mode
   */
  private exitEmergencyMode(): void {
    this.metrics.emergencyModeActive = false;
    this.metrics.consecutiveFailures = 0;
    console.log('✅ Emergency mode deactivated - Realtime operations resumed');
    
    window.dispatchEvent(new CustomEvent('realtime-emergency-exit'));
  }

  /**
   * Get current status
   */
  getStatus(): {
    isEmergency: boolean;
    metrics: EmergencyMetrics;
    limitsStatus: {
      hourlyUsage: number;
      dailyUsage: number;
      hoursUntilReset: number;
    };
  } {
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    const hoursUntilReset = (nextHour.getTime() - now.getTime()) / (1000 * 60 * 60);

    return {
      isEmergency: this.metrics.emergencyModeActive,
      metrics: { ...this.metrics },
      limitsStatus: {
        hourlyUsage: (this.metrics.hourlyMessages / (this.HOURLY_LIMITS.db_change + this.HOURLY_LIMITS.price_update + this.HOURLY_LIMITS.price_update_v3)) * 100,
        dailyUsage: (this.metrics.dailyMessages / this.DAILY_MESSAGE_LIMIT) * 100,
        hoursUntilReset
      }
    };
  }

  /**
   * Manual reset (admin function)
   */
  reset(): void {
    this.metrics = {
      hourlyMessages: 0,
      dailyMessages: 0,
      consecutiveFailures: 0,
      lastResetTime: Date.now(),
      emergencyModeActive: false,
      costExceeded: false
    };
    console.log('🔄 Emergency Breaker: Manual reset performed');
  }
}

export const emergencyRealtimeBreaker = EmergencyRealtimeBreaker.getInstance();