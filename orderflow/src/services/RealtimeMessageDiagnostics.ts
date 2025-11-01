/**
 * Realtime Message Diagnostics Service
 * Comprehensive diagnostic and reporting for the realtime message rate increase
 */

interface DiagnosticData {
  timestamp: number;
  component: string;
  event: string;
  details: Record<string, any>;
}

interface ProviderDiagnostics {
  mountCount: number;
  lastMount: number;
  lastUnmount: number | null;
  restartFrequency: number; // restarts per minute
  isStable: boolean;
}

class RealtimeMessageDiagnosticsService {
  private static instance: RealtimeMessageDiagnosticsService;
  private diagnostics: DiagnosticData[] = [];
  private providerMetrics = new Map<string, ProviderDiagnostics>();
  private readonly MAX_DIAGNOSTIC_HISTORY = 1000;

  static getInstance(): RealtimeMessageDiagnosticsService {
    if (!RealtimeMessageDiagnosticsService.instance) {
      RealtimeMessageDiagnosticsService.instance = new RealtimeMessageDiagnosticsService();
    }
    return RealtimeMessageDiagnosticsService.instance;
  }

  logEvent(component: string, event: string, details: Record<string, any> = {}): void {
    const diagnostic: DiagnosticData = {
      timestamp: Date.now(),
      component,
      event,
      details
    };

    this.diagnostics.push(diagnostic);

    // Keep only recent diagnostics
    if (this.diagnostics.length > this.MAX_DIAGNOSTIC_HISTORY) {
      this.diagnostics.shift();
    }

    // Special handling for provider events
    if (component === 'OptimizedWebSocketPriceProvider') {
      this.updateProviderMetrics(event, details);
    }

    // Log high-frequency events
    if (this.isHighFrequencyEvent(component, event)) {
      console.warn(`🚨 High-frequency event detected: ${component}.${event}`, details);
    }
  }

  private updateProviderMetrics(event: string, details: Record<string, any>): void {
    const providerId = 'OptimizedWebSocketPriceProvider';
    const existing = this.providerMetrics.get(providerId) || {
      mountCount: 0,
      lastMount: 0,
      lastUnmount: null,
      restartFrequency: 0,
      isStable: true
    };

    const now = Date.now();

    if (event === 'mount' || event === 'initialize') {
      existing.mountCount++;
      existing.lastMount = now;

      // Calculate restart frequency (restarts per minute)
      const recentMounts = this.diagnostics
        .filter(d => d.component === providerId && (d.event === 'mount' || d.event === 'initialize'))
        .filter(d => now - d.timestamp < 60000); // Last minute

      existing.restartFrequency = recentMounts.length;
      existing.isStable = existing.restartFrequency < 3; // Less than 3 restarts per minute = stable
    }

    if (event === 'unmount') {
      existing.lastUnmount = now;
    }

    this.providerMetrics.set(providerId, existing);
  }

  private isHighFrequencyEvent(component: string, event: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count occurrences of this event in the last minute
    const recentEvents = this.diagnostics.filter(d => 
      d.component === component && 
      d.event === event && 
      d.timestamp >= oneMinuteAgo
    );

    // Different thresholds for different events
    const thresholds: Record<string, number> = {
      'mount': 3,
      'initialize': 3,
      'connect': 5,
      'register_activity': 10,
      'price_update': 100
    };

    const threshold = thresholds[event] || 20;
    return recentEvents.length >= threshold;
  }

  getProviderDiagnostics(): Map<string, ProviderDiagnostics> {
    return new Map(this.providerMetrics);
  }

  getRecentEvents(component?: string, minutes: number = 5): DiagnosticData[] {
    const cutoff = Date.now() - (minutes * 60000);
    return this.diagnostics
      .filter(d => d.timestamp >= cutoff)
      .filter(d => !component || d.component === component)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getEventFrequency(component: string, event: string, minutes: number = 5): number {
    const cutoff = Date.now() - (minutes * 60000);
    return this.diagnostics
      .filter(d => d.component === component && d.event === event && d.timestamp >= cutoff)
      .length;
  }

  getRootCauseSummary(): {
    suspectedCauses: string[];
    restartLoops: ProviderDiagnostics[];
    highFrequencyEvents: Array<{ component: string; event: string; frequency: number }>;
    recommendations: string[];
  } {
    const suspectedCauses: string[] = [];
    const restartLoops: ProviderDiagnostics[] = [];
    const highFrequencyEvents: Array<{ component: string; event: string; frequency: number }> = [];
    const recommendations: string[] = [];

    // Check for provider restart loops
    this.providerMetrics.forEach((metrics, providerId) => {
      if (!metrics.isStable) {
        suspectedCauses.push(`${providerId} restart loop (${metrics.restartFrequency}/min)`);
        restartLoops.push(metrics);
        recommendations.push(`Investigate ${providerId} parent component re-rendering`);
      }
    });

    // Check for high-frequency events
    const eventCounts = new Map<string, number>();
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    this.diagnostics
      .filter(d => d.timestamp >= fiveMinutesAgo)
      .forEach(d => {
        const key = `${d.component}.${d.event}`;
        eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      });

    eventCounts.forEach((count, key) => {
      if (count > 50) { // More than 50 in 5 minutes = high frequency
        const [component, event] = key.split('.');
        highFrequencyEvents.push({ component, event, frequency: count });
        
        if (!suspectedCauses.includes(`High frequency ${key}`)) {
          suspectedCauses.push(`High frequency ${key} (${count} in 5min)`);
        }
      }
    });

    // Generate recommendations
    if (restartLoops.length > 0) {
      recommendations.push('Enable provider stability guards');
      recommendations.push('Add mount/unmount logging to identify restart triggers');
    }

    if (highFrequencyEvents.some(e => e.event === 'register_activity')) {
      recommendations.push('Increase UI activity registration intervals');
      recommendations.push('Implement session deduplication');
    }

    if (highFrequencyEvents.some(e => e.event.includes('price'))) {
      recommendations.push('Review price update throttling');
      recommendations.push('Check for subscription leak');
    }

    return {
      suspectedCauses,
      restartLoops,
      highFrequencyEvents,
      recommendations
    };
  }

  generateDiagnosticReport(): {
    timestamp: number;
    overallHealth: 'healthy' | 'warning' | 'critical';
    summary: string;
    details: ReturnType<typeof this.getRootCauseSummary>;
    recentActivity: DiagnosticData[];
  } {
    const rootCause = this.getRootCauseSummary();
    const recentActivity = this.getRecentEvents(undefined, 2);

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let summary = 'Realtime system operating normally';

    if (rootCause.suspectedCauses.length > 0) {
      if (rootCause.restartLoops.length > 0 || rootCause.highFrequencyEvents.length > 3) {
        overallHealth = 'critical';
        summary = 'Critical issues detected: provider restart loops or excessive message frequency';
      } else {
        overallHealth = 'warning';
        summary = 'Warning: potential performance issues detected';
      }
    }

    return {
      timestamp: Date.now(),
      overallHealth,
      summary,
      details: rootCause,
      recentActivity
    };
  }

  reset(): void {
    this.diagnostics = [];
    this.providerMetrics.clear();
    console.log('🔄 Realtime message diagnostics reset');
  }
}

export const realtimeMessageDiagnostics = RealtimeMessageDiagnosticsService.getInstance();
