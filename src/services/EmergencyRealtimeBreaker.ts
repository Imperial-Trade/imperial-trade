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

  // 🚨 EMERGENCY LIMITS: Ultra-aggressive to prevent cost explosion
  private readonly HOURLY_MESSAGE_LIMIT = 500; // 500 messages/hour max
  private readonly DAILY_MESSAGE_LIMIT = 5000; // 5K messages/day max
  private readonly COST_LIMIT_USD = 1.00; // $1/day absolute limit
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly EMERGENCY_COOLDOWN = 300000; // 5 minutes cooldown

  private constructor() {
    this.startHourlyReset();
    console.log('🚨 Emergency Realtime Breaker initialized - Ultra-aggressive cost protection');
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

  /**
   * Check if realtime operations should be allowed
   */
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

    // Check limits
    if (this.metrics.hourlyMessages >= this.HOURLY_MESSAGE_LIMIT) {
      this.activateEmergencyMode('Hourly message limit exceeded');
      return false;
    }

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

  /**
   * Record a realtime message
   */
  recordMessage(messageType?: string): boolean {
    if (!this.canAllowRealtimeOperation('message')) {
      console.warn(`🚨 Emergency Breaker: Message blocked (${messageType})`);
      return false;
    }

    this.metrics.hourlyMessages++;
    this.metrics.dailyMessages++;
    
    // Reset failure count on successful message
    this.metrics.consecutiveFailures = 0;

    // Check if we're approaching limits
    if (this.metrics.hourlyMessages >= this.HOURLY_MESSAGE_LIMIT * 0.9) {
      console.warn(`⚠️ Emergency Breaker: Approaching hourly limit (${this.metrics.hourlyMessages}/${this.HOURLY_MESSAGE_LIMIT})`);
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
        hourlyUsage: (this.metrics.hourlyMessages / this.HOURLY_MESSAGE_LIMIT) * 100,
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