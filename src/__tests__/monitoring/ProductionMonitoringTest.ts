
interface MonitoringConfig {
  endpoints: string[];
  thresholds: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  alerts: {
    email: string[];
    webhook?: string;
  };
}

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  timestamp: Date;
  error?: string;
}

class ProductionMonitor {
  private config: MonitoringConfig;
  private results: HealthCheckResult[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  async healthCheck(endpoint: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 10000,
        headers: { 'User-Agent': 'Production-Monitor/1.0' }
      });

      const responseTime = Date.now() - startTime;
      const status = this.determineStatus(response.status, responseTime);

      return {
        endpoint,
        status,
        responseTime,
        timestamp
      };
    } catch (error) {
      return {
        endpoint,
        status: 'down',
        responseTime: Date.now() - startTime,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private determineStatus(httpStatus: number, responseTime: number): 'healthy' | 'degraded' | 'down' {
    if (httpStatus >= 500) return 'down';
    if (httpStatus >= 400) return 'degraded';
    if (responseTime > this.config.thresholds.responseTime) return 'degraded';
    return 'healthy';
  }

  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results = await Promise.allSettled(
      this.config.endpoints.map(endpoint => this.healthCheck(endpoint))
    );

    const healthResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          endpoint: this.config.endpoints[index],
          status: 'down' as const,
          responseTime: 0,
          timestamp: new Date(),
          error: result.reason?.message || 'Health check failed'
        };
      }
    });

    this.results.push(...healthResults);
    return healthResults;
  }

  calculateUptime(endpoint: string, hours: number = 24): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantResults = this.results.filter(
      r => r.endpoint === endpoint && r.timestamp > cutoff
    );

    if (relevantResults.length === 0) return 100;

    const healthyChecks = relevantResults.filter(r => r.status === 'healthy').length;
    return (healthyChecks / relevantResults.length) * 100;
  }

  generateAlerts(results: HealthCheckResult[]): string[] {
    const alerts: string[] = [];

    results.forEach(result => {
      if (result.status === 'down') {
        alerts.push(`🚨 CRITICAL: ${result.endpoint} is DOWN - ${result.error || 'No response'}`);
      } else if (result.status === 'degraded') {
        alerts.push(`⚠️ WARNING: ${result.endpoint} is DEGRADED - Response time: ${result.responseTime}ms`);
      }

      if (result.responseTime > this.config.thresholds.responseTime) {
        alerts.push(`⏰ SLOW RESPONSE: ${result.endpoint} - ${result.responseTime}ms (threshold: ${this.config.thresholds.responseTime}ms)`);
      }
    });

    return alerts;
  }

  generateStatusReport(): string {
    const recentResults = this.results.slice(-this.config.endpoints.length);
    const overallStatus = recentResults.every(r => r.status === 'healthy') ? 'All Systems Operational' : 
                         recentResults.some(r => r.status === 'down') ? 'Service Disruption' : 'Degraded Performance';

    let report = `# System Status Report\n\n`;
    report += `**Overall Status**: ${overallStatus}\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;

    this.config.endpoints.forEach(endpoint => {
      const latestResult = recentResults.find(r => r.endpoint === endpoint);
      const uptime = this.calculateUptime(endpoint);
      
      report += `## ${endpoint}\n`;
      report += `- Status: ${latestResult?.status || 'Unknown'}\n`;
      report += `- Response Time: ${latestResult?.responseTime || 'N/A'}ms\n`;
      report += `- Uptime (24h): ${uptime.toFixed(2)}%\n`;
      if (latestResult?.error) {
        report += `- Error: ${latestResult.error}\n`;
      }
      report += '\n';
    });

    return report;
  }

  async sendAlert(message: string) {
    console.log(`📢 ALERT: ${message}`);
    
    // In production, implement actual alerting
    if (this.config.alerts.webhook) {
      try {
        await fetch(this.config.alerts.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }
  }
}

export { ProductionMonitor, MonitoringConfig, HealthCheckResult };
