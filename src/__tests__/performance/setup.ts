
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { performanceReporter } from './PerformanceReporter';

// Global performance test setup
beforeAll(() => {
  console.log('🚀 Starting Performance Test Suite');
  
  // Clear any existing metrics
  performanceReporter.clearMetrics();
  
  // Setup global performance monitoring
  if (typeof global !== 'undefined') {
    // Enable garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Monitor unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      performanceReporter.recordMetric('unhandled_rejection', 1, 'count');
    });
  }
});

afterAll(() => {
  console.log('🏁 Performance Test Suite Completed');
  
  // Generate final report
  const report = performanceReporter.generateReport('performance_suite');
  
  console.log('📊 Performance Summary:');
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   Passed: ${report.summary.passedTests}`);
  console.log(`   Failed: ${report.summary.failedTests}`);
  console.log(`   Average Execution Time: ${report.summary.averageExecutionTime.toFixed(2)}ms`);
  console.log(`   Memory Usage: ${(report.summary.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB peak`);
  
  // Save report to file (in real environment)
  if (process.env.CI) {
    console.log('Performance Report:', performanceReporter.exportReport(report));
  }
});

let testStartTime: number;
let testStartMemory: number;

beforeEach(() => {
  testStartTime = performance.now();
  testStartMemory = process.memoryUsage().heapUsed;
});

afterEach(() => {
  const testEndTime = performance.now();
  const testEndMemory = process.memoryUsage().heapUsed;
  
  const duration = testEndTime - testStartTime;
  const memoryDelta = testEndMemory - testStartMemory;
  
  // Record test metrics
  performanceReporter.recordMetric('test_duration', duration, 'ms', 5000); // 5s threshold
  performanceReporter.recordMetric('test_memory_delta', memoryDelta / 1024 / 1024, 'MB', 10); // 10MB threshold
});

// Custom matchers for performance testing
expect.extend({
  toBeWithinPerformanceThreshold(received: number, threshold: number, unit: string = 'ms') {
    const pass = received <= threshold;
    
    performanceReporter.recordMetric(
      `custom_threshold_check`,
      received,
      unit,
      threshold,
      { passed: pass }
    );
    
    if (pass) {
      return {
        message: () => `Expected ${received}${unit} to exceed ${threshold}${unit}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}${unit} to be within ${threshold}${unit} threshold`,
        pass: false,
      };
    }
  },
  
  toHaveMemoryLeakLessThan(received: { before: number; after: number }, threshold: number) {
    const leak = received.after - received.before;
    const thresholdBytes = threshold * 1024 * 1024; // Convert MB to bytes
    const pass = leak < thresholdBytes;
    
    performanceReporter.recordMetric(
      'memory_leak_check',
      leak / 1024 / 1024,
      'MB',
      threshold,
      { passed: pass }
    );
    
    if (pass) {
      return {
        message: () => `Expected memory leak of ${(leak / 1024 / 1024).toFixed(2)}MB to exceed ${threshold}MB`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected memory leak of ${(leak / 1024 / 1024).toFixed(2)}MB to be less than ${threshold}MB`,
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(threshold: number, unit?: string): R;
      toHaveMemoryLeakLessThan(threshold: number): R;
    }
  }
}
