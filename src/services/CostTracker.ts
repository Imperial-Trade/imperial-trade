interface CostMetrics {
  realtimeMessages: number;
  totalCostUSD: number;
  dailyCostUSD: number;
  monthlyCostUSD: number;
  lastResetTime: number;
  peakHourlyRate: number;
  currentHourlyRate: number;
}

interface CostAlert {
  type: 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
}

class CostTracker {
  private static instance: CostTracker;
  private metrics: CostMetrics = {
    realtimeMessages: 0,
    totalCostUSD: 0,
    dailyCostUSD: 0,
    monthlyCostUSD: 0,
    lastResetTime: Date.now(),
    peakHourlyRate: 0,
    currentHourlyRate: 0
  };

  private hourlyMessages: number[] = [];
  private readonly MESSAGE_COST_USD = 0.00024; // $0.24 per 1M messages
  private readonly DAILY_WARNING_THRESHOLD = 5.00; // $5/day warning
  private readonly DAILY_CRITICAL_THRESHOLD = 20.00; // $20/day critical
  private alerts: CostAlert[] = [];

  private constructor() {
    this.startHourlyTracking();
  }

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  private startHourlyTracking() {
    setInterval(() => {
      this.updateHourlyMetrics();
    }, 3600000); // Every hour
  }

  private updateHourlyMetrics() {
    const currentHourMessages = this.metrics.realtimeMessages;
    this.hourlyMessages.push(currentHourMessages);
    
    // Keep only last 24 hours
    if (this.hourlyMessages.length > 24) {
      this.hourlyMessages.shift();
    }

    this.metrics.currentHourlyRate = currentHourMessages;
    this.metrics.peakHourlyRate = Math.max(...this.hourlyMessages);
    
    this.checkCostAlerts();
  }

  recordRealtimeMessage(type: 'price_update' | 'subscription' | 'presence' | 'broadcast' = 'price_update') {
    this.metrics.realtimeMessages++;
    
    // Calculate costs
    this.metrics.totalCostUSD = this.metrics.realtimeMessages * this.MESSAGE_COST_USD;
    
    const now = Date.now();
    const hoursElapsed = (now - this.metrics.lastResetTime) / (1000 * 60 * 60);
    const daysElapsed = hoursElapsed / 24;
    
    this.metrics.dailyCostUSD = this.metrics.totalCostUSD / Math.max(daysElapsed, 0.01);
    this.metrics.monthlyCostUSD = this.metrics.dailyCostUSD * 30;

    // Log expensive operations
    if (type === 'broadcast' && this.metrics.realtimeMessages % 1000 === 0) {
      console.log(`💰 Cost Update: ${this.metrics.realtimeMessages} messages, $${this.metrics.dailyCostUSD.toFixed(4)}/day`);
    }
  }

  private checkCostAlerts() {
    const dailyCost = this.metrics.dailyCostUSD;
    
    if (dailyCost > this.DAILY_CRITICAL_THRESHOLD) {
      this.addAlert('critical', `Daily cost exceeded critical threshold: $${dailyCost.toFixed(2)}/day`, this.DAILY_CRITICAL_THRESHOLD, dailyCost);
    } else if (dailyCost > this.DAILY_WARNING_THRESHOLD) {
      this.addAlert('warning', `Daily cost approaching limit: $${dailyCost.toFixed(2)}/day`, this.DAILY_WARNING_THRESHOLD, dailyCost);
    }
  }

  private addAlert(type: 'warning' | 'critical', message: string, threshold: number, currentValue: number) {
    const alert: CostAlert = {
      type,
      message,
      threshold,
      currentValue,
      timestamp: Date.now()
    };
    
    this.alerts.unshift(alert);
    
    // Keep only last 10 alerts
    if (this.alerts.length > 10) {
      this.alerts.pop();
    }

    // Log critical alerts
    if (type === 'critical') {
      console.error(`🚨 COST ALERT: ${message}`);
    } else {
      console.warn(`⚠️ Cost Warning: ${message}`);
    }
  }

  getMetrics(): CostMetrics & { 
    projectedMonthlyCost: number;
    costEfficiencyRatio: number;
    alerts: CostAlert[];
  } {
    const projectedMonthlyCost = this.metrics.dailyCostUSD * 30;
    const costEfficiencyRatio = this.metrics.realtimeMessages > 0 ? 
      (this.metrics.realtimeMessages / Math.max(this.metrics.totalCostUSD * 1000000, 1)) : 0;

    return {
      ...this.metrics,
      projectedMonthlyCost,
      costEfficiencyRatio,
      alerts: this.alerts
    };
  }

  reset() {
    this.metrics = {
      realtimeMessages: 0,
      totalCostUSD: 0,
      dailyCostUSD: 0,
      monthlyCostUSD: 0,
      lastResetTime: Date.now(),
      peakHourlyRate: 0,
      currentHourlyRate: 0
    };
    this.alerts = [];
    this.hourlyMessages = [];
  }

  getCostSummary(): {
    current: string;
    daily: string;
    monthly: string;
    status: 'optimal' | 'warning' | 'critical';
  } {
    const daily = this.metrics.dailyCostUSD;
    const status = daily > this.DAILY_CRITICAL_THRESHOLD ? 'critical' : 
                  daily > this.DAILY_WARNING_THRESHOLD ? 'warning' : 'optimal';

    return {
      current: `$${this.metrics.totalCostUSD.toFixed(4)}`,
      daily: `$${daily.toFixed(2)}/day`,
      monthly: `$${this.metrics.monthlyCostUSD.toFixed(0)}/month`,
      status
    };
  }
}

export const costTracker = CostTracker.getInstance();
export type { CostMetrics, CostAlert };
