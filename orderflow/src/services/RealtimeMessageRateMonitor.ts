/**
 * Realtime Message Rate Monitor
 * Tracks and reports realtime message frequency to prevent cost explosions
 */

interface MessageMetrics {
  count: number;
  lastSeen: number;
  type: string;
  source: string;
}

interface RateMetrics {
  messagesPerMinute: number;
  messagesPerHour: number;
  peakRate: number;
  isExcessive: boolean;
  costEstimate: number;
}

class RealtimeMessageRateMonitor {
  private static instance: RealtimeMessageRateMonitor;
  private messages = new Map<string, MessageMetrics>();
  private readonly MESSAGE_COST = 0.00003; // $0.00003 per message (rough estimate)
  private readonly EXCESSIVE_RATE_THRESHOLD = 100; // messages per minute
  private readonly CRITICAL_RATE_THRESHOLD = 300; // messages per minute
  
  static getInstance(): RealtimeMessageRateMonitor {
    if (!RealtimeMessageRateMonitor.instance) {
      RealtimeMessageRateMonitor.instance = new RealtimeMessageRateMonitor();
    }
    return RealtimeMessageRateMonitor.instance;
  }

  recordMessage(type: string, source: string = 'unknown'): void {
    const key = `${type}-${source}`;
    const now = Date.now();
    
    const existing = this.messages.get(key);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
    } else {
      this.messages.set(key, {
        count: 1,
        lastSeen: now,
        type,
        source
      });
    }
    
    // Clean up old entries (older than 1 hour)
    this.cleanupOldMessages();
    
    // Check for excessive rates
    const currentRate = this.getCurrentRate();
    if (currentRate.isExcessive) {
      console.warn(`🚨 Excessive realtime message rate detected: ${currentRate.messagesPerMinute}/min`);
      
      if (currentRate.messagesPerMinute > this.CRITICAL_RATE_THRESHOLD) {
        console.error(`🚨 CRITICAL: Realtime message rate ${currentRate.messagesPerMinute}/min exceeds safe limits!`);
        
        // Dispatch emergency event
        window.dispatchEvent(new CustomEvent('realtime-rate-critical', {
          detail: { rate: currentRate, messages: this.getRecentMessages() }
        }));
      }
    }
  }

  getCurrentRate(): RateMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    
    let messagesLastMinute = 0;
    let messagesLastHour = 0;
    let peakRate = 0;
    
    // Calculate rates
    this.messages.forEach(message => {
      if (message.lastSeen >= oneMinuteAgo) {
        messagesLastMinute++;
      }
      if (message.lastSeen >= oneHourAgo) {
        messagesLastHour++;
      }
    });
    
    // Estimate peak rate (simplified)
    peakRate = Math.max(messagesLastMinute, peakRate);
    
    const isExcessive = messagesLastMinute > this.EXCESSIVE_RATE_THRESHOLD;
    const costEstimate = messagesLastHour * this.MESSAGE_COST;
    
    return {
      messagesPerMinute: messagesLastMinute,
      messagesPerHour: messagesLastHour,
      peakRate,
      isExcessive,
      costEstimate
    };
  }

  getRecentMessages(minutes: number = 5): Array<{ type: string; source: string; count: number; lastSeen: number }> {
    const cutoff = Date.now() - (minutes * 60000);
    const recent: Array<{ type: string; source: string; count: number; lastSeen: number }> = [];
    
    this.messages.forEach((message, key) => {
      if (message.lastSeen >= cutoff) {
        recent.push({
          type: message.type,
          source: message.source,
          count: message.count,
          lastSeen: message.lastSeen
        });
      }
    });
    
    return recent.sort((a, b) => b.count - a.count);
  }

  getTopMessageTypes(limit: number = 10): Array<{ type: string; source: string; count: number; rate: number }> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const types: Array<{ type: string; source: string; count: number; rate: number }> = [];
    
    this.messages.forEach(message => {
      if (message.lastSeen >= oneHourAgo) {
        const hoursActive = Math.max(1, (now - (message.lastSeen - 3600000)) / 3600000);
        const rate = message.count / hoursActive;
        
        types.push({
          type: message.type,
          source: message.source,
          count: message.count,
          rate
        });
      }
    });
    
    return types
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private cleanupOldMessages(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    this.messages.forEach((message, key) => {
      if (message.lastSeen < oneHourAgo) {
        this.messages.delete(key);
      }
    });
  }

  reset(): void {
    this.messages.clear();
    console.log('🔄 Realtime message rate monitor reset');
  }

  getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    currentRate: RateMetrics;
    topTypes: Array<{ type: string; source: string; count: number; rate: number }>;
    recommendations: string[];
  } {
    const currentRate = this.getCurrentRate();
    const topTypes = this.getTopMessageTypes(5);
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (currentRate.messagesPerMinute > this.CRITICAL_RATE_THRESHOLD) {
      status = 'critical';
      recommendations.push('CRITICAL: Immediately investigate high-frequency message sources');
      recommendations.push('Consider enabling emergency circuit breaker');
    } else if (currentRate.messagesPerMinute > this.EXCESSIVE_RATE_THRESHOLD) {
      status = 'warning';
      recommendations.push('WARNING: Message rate approaching unsafe levels');
      recommendations.push('Review subscription patterns and consider optimization');
    }
    
    if (currentRate.costEstimate > 0.10) {
      recommendations.push(`Cost estimate: $${currentRate.costEstimate.toFixed(4)}/hour - consider cost optimization`);
    }
    
    // Specific recommendations based on top message types
    topTypes.forEach(type => {
      if (type.type.includes('price') && type.rate > 50) {
        recommendations.push(`High-frequency price updates from ${type.source} - consider throttling`);
      }
      if (type.type.includes('ui_activity') && type.count > 100) {
        recommendations.push(`Excessive UI activity registrations - review session management`);
      }
    });
    
    return {
      status,
      currentRate,
      topTypes,
      recommendations
    };
  }
}

export const realtimeMessageRateMonitor = RealtimeMessageRateMonitor.getInstance();