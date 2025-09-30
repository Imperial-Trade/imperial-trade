// 🚀 PHASE 3: Performance Monitoring Service
// Real-time latency tracking and connection health monitoring

interface LatencyMetric {
  timestamp: number;
  latency: number;
  source: 'websocket' | 'realtime' | 'polling';
}

interface ConnectionMetric {
  timestamp: number;
  status: 'connected' | 'degraded' | 'disconnected';
  activeSource: 'websocket' | 'realtime' | 'polling';
}

class PerformanceMonitor {
  private latencyHistory: LatencyMetric[] = [];
  private connectionHistory: ConnectionMetric[] = [];
  private maxHistorySize = 1000;

  // Record latency measurement
  recordLatency(latency: number, source: 'websocket' | 'realtime' | 'polling') {
    this.latencyHistory.push({
      timestamp: Date.now(),
      latency,
      source
    });

    // Keep only recent history
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory = this.latencyHistory.slice(-this.maxHistorySize);
    }
  }

  // Record connection status
  recordConnection(status: 'connected' | 'degraded' | 'disconnected', activeSource: 'websocket' | 'realtime' | 'polling') {
    this.connectionHistory.push({
      timestamp: Date.now(),
      status,
      activeSource
    });

    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(-this.maxHistorySize);
    }
  }

  // Get average latency
  getAverageLatency(timeWindowMs: number = 60000): number {
    const now = Date.now();
    const recent = this.latencyHistory.filter(m => now - m.timestamp < timeWindowMs);
    
    if (recent.length === 0) return 0;
    
    const sum = recent.reduce((acc, m) => acc + m.latency, 0);
    return sum / recent.length;
  }

  // Get P95 latency
  getP95Latency(timeWindowMs: number = 60000): number {
    const now = Date.now();
    const recent = this.latencyHistory
      .filter(m => now - m.timestamp < timeWindowMs)
      .map(m => m.latency)
      .sort((a, b) => a - b);
    
    if (recent.length === 0) return 0;
    
    const p95Index = Math.floor(recent.length * 0.95);
    return recent[p95Index] || 0;
  }

  // Get connection uptime percentage
  getUptimePercentage(timeWindowMs: number = 3600000): number {
    const now = Date.now();
    const recent = this.connectionHistory.filter(m => now - m.timestamp < timeWindowMs);
    
    if (recent.length === 0) return 100;
    
    const connectedCount = recent.filter(m => m.status === 'connected').length;
    return (connectedCount / recent.length) * 100;
  }

  // Get latency by source
  getLatencyBySource(source: 'websocket' | 'realtime' | 'polling', timeWindowMs: number = 60000): number {
    const now = Date.now();
    const recent = this.latencyHistory.filter(
      m => now - m.timestamp < timeWindowMs && m.source === source
    );
    
    if (recent.length === 0) return 0;
    
    const sum = recent.reduce((acc, m) => acc + m.latency, 0);
    return sum / recent.length;
  }

  // Get health report
  getHealthReport() {
    const avgLatency = this.getAverageLatency();
    const p95Latency = this.getP95Latency();
    const uptime = this.getUptimePercentage();
    
    const wsLatency = this.getLatencyBySource('websocket');
    const rtLatency = this.getLatencyBySource('realtime');
    const pollLatency = this.getLatencyBySource('polling');

    return {
      overall: {
        averageLatency: Math.round(avgLatency),
        p95Latency: Math.round(p95Latency),
        uptimePercentage: Math.round(uptime * 100) / 100,
        health: this.calculateHealthScore(avgLatency, p95Latency, uptime)
      },
      bySource: {
        websocket: Math.round(wsLatency),
        realtime: Math.round(rtLatency),
        polling: Math.round(pollLatency)
      },
      recommendations: this.getRecommendations(avgLatency, p95Latency, uptime)
    };
  }

  // Calculate health score (0-100)
  private calculateHealthScore(avgLatency: number, p95Latency: number, uptime: number): number {
    let score = 100;

    // Latency penalty
    if (avgLatency > 100) score -= 20;
    else if (avgLatency > 50) score -= 10;

    // P95 latency penalty
    if (p95Latency > 200) score -= 20;
    else if (p95Latency > 100) score -= 10;

    // Uptime penalty
    if (uptime < 95) score -= 30;
    else if (uptime < 99) score -= 15;

    return Math.max(0, score);
  }

  // Get performance recommendations
  private getRecommendations(avgLatency: number, p95Latency: number, uptime: number): string[] {
    const recommendations: string[] = [];

    if (avgLatency > 100) {
      recommendations.push('High average latency detected. Consider optimizing network connection.');
    }

    if (p95Latency > 200) {
      recommendations.push('High P95 latency detected. Check for network congestion or server issues.');
    }

    if (uptime < 95) {
      recommendations.push('Low uptime detected. Check WebSocket stability and fallback mechanisms.');
    }

    if (avgLatency < 50 && p95Latency < 100 && uptime > 99) {
      recommendations.push('Excellent performance! System is operating optimally.');
    }

    return recommendations;
  }

  // Clear history
  clearHistory() {
    this.latencyHistory = [];
    this.connectionHistory = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
