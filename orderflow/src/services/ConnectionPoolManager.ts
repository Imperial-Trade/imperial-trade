
interface ConnectionMetrics {
  activeConnections: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
}

interface PoolConfig {
  maxConnections: number;
  healthCheckInterval: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
}

/**
 * Advanced Connection Pool Manager
 * Optimized for high-frequency Forex trading operations
 */
class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private config: PoolConfig;
  private metrics: ConnectionMetrics;
  private circuitBreakerOpen = false;
  private healthCheckInterval: NodeJS.Timeout;
  private requestQueue: Array<{ resolve: Function; reject: Function; timestamp: number }> = [];

  private constructor(config: Partial<PoolConfig> = {}) {
    // ULTRA-COST OPTIMIZATION: Dynamic scaling based on market activity
    const baseConnections = this.isMarketHours() ? 15 : 5;
    this.config = {
      maxConnections: this.isPeakHours() ? 25 : baseConnections, // Dynamic scaling
      healthCheckInterval: 45000, // 45s health checks (cost optimization)
      retryAttempts: 2, // Reduced retries for faster failure detection
      circuitBreakerThreshold: 0.3, // More aggressive circuit breaker
      ...config
    };

    this.metrics = {
      activeConnections: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastHealthCheck: new Date()
    };

    this.startHealthCheck();
    console.log('🔗 ConnectionPoolManager initialized for trading workloads');
  }

  static getInstance(config?: Partial<PoolConfig>): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager(config);
    }
    return ConnectionPoolManager.instance;
  }

  // Execute with connection pool management
  async execute<T>(operation: () => Promise<T>, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<T> {
    // Circuit breaker check
    if (this.circuitBreakerOpen) {
      throw new Error('Circuit breaker is open - database connections failing');
    }

    // Check connection capacity
    if (this.metrics.activeConnections >= this.config.maxConnections) {
      if (priority === 'high') {
        // High priority operations bypass queue
        console.warn('⚡ High priority operation bypassing connection limit');
      } else {
        await this.waitForConnection();
      }
    }

    const startTime = performance.now();
    this.metrics.activeConnections++;
    this.metrics.totalRequests++;

    try {
      const result = await this.executeWithRetry(operation);
      this.updateMetrics(startTime, true);
      return result;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    } finally {
      this.metrics.activeConnections--;
    }
  }

  // Retry logic with exponential backoff
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry auth errors or validation errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
          console.log(`🔄 Connection retry ${attempt}/${this.config.retryAttempts} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('invalid') || 
           message.includes('unauthorized') || 
           message.includes('forbidden') ||
           message.includes('not found');
  }

  // Wait for available connection
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - pool exhausted'));
      }, 10000); // 10s timeout

      this.requestQueue.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: Date.now()
      });

      // Process queue when connections become available
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0 || this.metrics.activeConnections >= this.config.maxConnections) {
      return;
    }

    const request = this.requestQueue.shift();
    if (request) {
      // Check if request hasn't timed out
      if (Date.now() - request.timestamp < 10000) {
        request.resolve();
      } else {
        request.reject(new Error('Request timeout in queue'));
      }
    }
  }

  // Update performance metrics
  private updateMetrics(startTime: number, success: boolean): void {
    const responseTime = performance.now() - startTime;
    
    // Update moving average response time
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    
    // Update error rate (moving average)
    const errorValue = success ? 0 : 1;
    this.metrics.errorRate = (this.metrics.errorRate * 0.95) + (errorValue * 0.05);
    
    // Circuit breaker logic
    if (this.metrics.errorRate > this.config.circuitBreakerThreshold && this.metrics.totalRequests > 10) {
      console.error('🚨 Circuit breaker OPEN - high error rate detected');
      this.circuitBreakerOpen = true;
      
      // Auto-reset after 30 seconds
      setTimeout(() => {
        this.circuitBreakerOpen = false;
        console.log('✅ Circuit breaker CLOSED - retrying connections');
      }, 30000);
    }
  }

  // Health monitoring
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Simple health check - could be enhanced with actual DB ping
      this.metrics.lastHealthCheck = new Date();
      
      // Log performance metrics
      if (this.metrics.totalRequests > 0) {
        console.log(`📊 Connection Pool Health:`, {
          active: this.metrics.activeConnections,
          avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
          errorRate: `${(this.metrics.errorRate * 100).toFixed(2)}%`,
          queueLength: this.requestQueue.length
        });
      }
      
      // Clean expired queue items
      const now = Date.now();
      this.requestQueue = this.requestQueue.filter(req => {
        if (now - req.timestamp > 15000) { // 15s timeout
          req.reject(new Error('Request expired in queue'));
          return false;
        }
        return true;
      });
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  // Get current metrics
  getMetrics(): ConnectionMetrics & { queueLength: number; circuitBreakerOpen: boolean } {
    return {
      ...this.metrics,
      queueLength: this.requestQueue.length,
      circuitBreakerOpen: this.circuitBreakerOpen
    };
  }

  // Forex market hour optimization
  isMarketHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // Forex market is most active 22:00 Sunday - 22:00 Friday UTC
    // Peak hours: London (8-17 UTC) and New York (13-22 UTC) overlap
    return utcHour >= 6 && utcHour <= 23; // Conservative active hours
  }

  isPeakHours(): boolean {
    const utcHour = new Date().getUTCHours();
    // London/New York overlap: 13:00-17:00 UTC (most volatile)
    return utcHour >= 13 && utcHour <= 17;
  }

  // ULTRA-COST OPTIMIZATION: Aggressive pool scaling for cost savings
  getOptimalPoolSize(): number {
    if (!this.isMarketHours()) {
      return 3; // Ultra-minimal during market close
    }
    if (this.isPeakHours()) {
      return Math.min(this.config.maxConnections, 25); // Capped maximum
    }
    return Math.max(Math.floor(this.config.maxConnections * 0.4), 5); // 40% during normal hours
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Reject all pending requests
    this.requestQueue.forEach(req => {
      req.reject(new Error('Connection pool shutting down'));
    });
    this.requestQueue = [];
    
    console.log('🔌 ConnectionPoolManager destroyed');
  }
}

export const connectionPool = ConnectionPoolManager.getInstance({
  maxConnections: 50,
  healthCheckInterval: 30000,
  retryAttempts: 3,
  circuitBreakerThreshold: 0.4 // 40% error rate for circuit breaker
});
