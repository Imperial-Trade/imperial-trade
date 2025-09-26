/**
 * Provider Stability Service
 * Prevents provider restart loops and tracks mount/unmount cycles
 */

interface ProviderMetrics {
  initCount: number;
  mountTime: number;
  lastUnmountTime: number | null;
  rapidRestarts: number;
  isStable: boolean;
}

class ProviderStabilityService {
  private static instance: ProviderStabilityService;
  private providers = new Map<string, ProviderMetrics>();
  private readonly RESTART_THRESHOLD = 5; // INCREASED: Max restarts within time window (was 3)
  private readonly TIME_WINDOW = 30000; // INCREASED: 30 seconds (was 10 seconds)
  private readonly COOLDOWN_PERIOD = 10000; // REDUCED: 10 seconds (was 30 seconds)

  static getInstance(): ProviderStabilityService {
    if (!ProviderStabilityService.instance) {
      ProviderStabilityService.instance = new ProviderStabilityService();
    }
    return ProviderStabilityService.instance;
  }

  registerProviderMount(providerId: string): boolean {
    const now = Date.now();
    const existing = this.providers.get(providerId);
    
    if (existing) {
      // Check if this is a rapid restart
      const timeSinceLastMount = now - existing.mountTime;
      
      if (timeSinceLastMount < this.TIME_WINDOW) {
        existing.rapidRestarts++;
        existing.initCount++;
        
        // Block if too many rapid restarts
        if (existing.rapidRestarts >= this.RESTART_THRESHOLD) {
          existing.isStable = false;
          console.error(`🚨 ${providerId}: Restart loop detected (${existing.rapidRestarts} restarts in ${timeSinceLastMount}ms)`);
          return false;
        }
      } else {
        // Reset rapid restart counter after time window
        existing.rapidRestarts = 0;
        existing.isStable = true;
      }
      
      existing.mountTime = now;
    } else {
      // First mount
      this.providers.set(providerId, {
        initCount: 1,
        mountTime: now,
        lastUnmountTime: null,
        rapidRestarts: 0,
        isStable: true
      });
    }
    
    return true;
  }

  registerProviderUnmount(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.lastUnmountTime = Date.now();
    }
  }

  isProviderStable(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return true; // First mount is always allowed
    
    // Check cooldown period after restart loop
    if (!provider.isStable) {
      const timeSinceMount = Date.now() - provider.mountTime;
      if (timeSinceMount > this.COOLDOWN_PERIOD) {
        provider.isStable = true;
        provider.rapidRestarts = 0;
        console.log(`✅ ${providerId}: Cooldown period elapsed, provider stability restored`);
      }
    }
    
    return provider.isStable;
  }

  getProviderMetrics(providerId: string): ProviderMetrics | null {
    return this.providers.get(providerId) || null;
  }

  getAllMetrics(): Record<string, ProviderMetrics> {
    const result: Record<string, ProviderMetrics> = {};
    this.providers.forEach((metrics, id) => {
      result[id] = metrics;
    });
    return result;
  }

  reset(providerId?: string): void {
    if (providerId) {
      this.providers.delete(providerId);
      console.log(`🔄 ${providerId}: Provider metrics reset`);
    } else {
      this.providers.clear();
      console.log('🔄 All provider metrics reset');
    }
  }

  // EMERGENCY RESET METHOD: Force allow provider mounting
  emergencyReset(providerId: string): void {
    const existing = this.providers.get(providerId);
    if (existing) {
      existing.isStable = true;
      existing.rapidRestarts = 0;
      existing.initCount = 1;
      existing.mountTime = Date.now();
      console.log(`🚨 ${providerId}: EMERGENCY RESET - Provider stability restored, restart loop cleared`);
    } else {
      this.providers.set(providerId, {
        initCount: 1,
        mountTime: Date.now(),
        lastUnmountTime: null,
        rapidRestarts: 0,
        isStable: true
      });
      console.log(`🚨 ${providerId}: EMERGENCY RESET - New provider metrics created as stable`);
    }
  }
}

export const providerStabilityService = ProviderStabilityService.getInstance();