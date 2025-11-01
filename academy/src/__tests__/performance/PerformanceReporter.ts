
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  testSuite: string;
  timestamp: number;
  metrics: PerformanceMetric[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageExecutionTime: number;
    memoryUsage: {
      initial: number;
      peak: number;
      final: number;
    };
  };
}

export class PerformanceReporter {
  private static instance: PerformanceReporter;
  private metrics: PerformanceMetric[] = [];
  private reports: PerformanceReport[] = [];

  private constructor() {}

  static getInstance(): PerformanceReporter {
    if (!PerformanceReporter.instance) {
      PerformanceReporter.instance = new PerformanceReporter();
    }
    return PerformanceReporter.instance;
  }

  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    threshold?: number,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      threshold,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Log performance warning if threshold exceeded
    if (threshold && value > threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${name} = ${value}${unit} (threshold: ${threshold}${unit})`);
    } else {
      console.log(`✅ Performance metric: ${name} = ${value}${unit}`);
    }
  }

  startPerformanceTest(testName: string): () => void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      this.recordMetric(`${testName}_duration`, duration, 'ms');
      this.recordMetric(`${testName}_memory_delta`, memoryDelta / 1024 / 1024, 'MB');
    };
  }

  generateReport(testSuite: string): PerformanceReport {
    const suiteMetrics = this.metrics.filter(m => 
      m.name.includes(testSuite) || m.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    const passedTests = suiteMetrics.filter(m => 
      !m.threshold || m.value <= m.threshold
    ).length;

    const failedTests = suiteMetrics.filter(m => 
      m.threshold && m.value > m.threshold
    ).length;

    const totalTests = suiteMetrics.filter(m => m.name.endsWith('_duration')).length;

    const executionTimes = suiteMetrics
      .filter(m => m.name.endsWith('_duration'))
      .map(m => m.value);

    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    const memoryMetrics = suiteMetrics.filter(m => m.name.includes('memory'));
    const memoryValues = memoryMetrics.map(m => m.value);

    const report: PerformanceReport = {
      testSuite,
      timestamp: Date.now(),
      metrics: suiteMetrics,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageExecutionTime,
        memoryUsage: {
          initial: Math.min(...memoryValues) || 0,
          peak: Math.max(...memoryValues) || 0,
          final: memoryValues[memoryValues.length - 1] || 0
        }
      }
    };

    this.reports.push(report);
    return report;
  }

  exportReport(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  getPerformanceTrends(metricName: string, timeRange: number = 3600000): PerformanceMetric[] {
    const cutoff = Date.now() - timeRange;
    return this.metrics
      .filter(m => m.name === metricName && m.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getBenchmarkComparison(currentValue: number, metricName: string): {
    status: 'better' | 'worse' | 'similar';
    difference: number;
    percentageChange: number;
  } {
    const historicalValues = this.metrics
      .filter(m => m.name === metricName)
      .map(m => m.value)
      .slice(-10); // Last 10 measurements

    if (historicalValues.length === 0) {
      return { status: 'similar', difference: 0, percentageChange: 0 };
    }

    const average = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const difference = currentValue - average;
    const percentageChange = (difference / average) * 100;

    let status: 'better' | 'worse' | 'similar' = 'similar';
    if (Math.abs(percentageChange) > 10) { // 10% threshold
      status = difference < 0 ? 'better' : 'worse';
    }

    return { status, difference, percentageChange };
  }
}

// Global performance reporter instance
export const performanceReporter = PerformanceReporter.getInstance();

// Test helper functions
export const measurePerformance = <T>(
  name: string,
  fn: () => T | Promise<T>,
  threshold?: number
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    const endTest = performanceReporter.startPerformanceTest(name);
    
    try {
      const result = await fn();
      endTest();
      resolve(result);
    } catch (error) {
      endTest();
      reject(error);
    }
  });
};

export const memorySnapshot = (): number => {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage().heapUsed;
};

export const detectMemoryLeak = (
  before: number,
  after: number,
  threshold: number = 5 * 1024 * 1024 // 5MB
): boolean => {
  const leak = after - before;
  if (leak > threshold) {
    console.warn(`🚨 Potential memory leak detected: ${(leak / 1024 / 1024).toFixed(2)}MB increase`);
    return true;
  }
  return false;
};
