
import { useEffect, useRef } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';
import { useThrottle } from '@/hooks/useOptimizedDebounce';

// Singleton performance observer manager
class OptimizedPerformanceObserverManager {
  private static instance: OptimizedPerformanceObserverManager;
  private observers = new Map<string, PerformanceObserver>();
  private activeTrackers = new Set<string>();
  private performanceData = new Map<string, number>();
  private lastTrackTime = 0;
  private readonly trackingInterval = 30000; // 30 seconds

  static getInstance(): OptimizedPerformanceObserverManager {
    if (!OptimizedPerformanceObserverManager.instance) {
      OptimizedPerformanceObserverManager.instance = new OptimizedPerformanceObserverManager();
    }
    return OptimizedPerformanceObserverManager.instance;
  }

  addTracker(trackerId: string, trackFunction: (metric: string, value: number, context?: Record<string, any>) => void): void {
    if (this.activeTrackers.has(trackerId)) return;
    
    this.activeTrackers.add(trackerId);
    
    // Only create observers if this is the first tracker
    if (this.activeTrackers.size === 1) {
      this.initializeObservers(trackFunction);
    }
  }

  removeTracker(trackerId: string): void {
    this.activeTrackers.delete(trackerId);
    
    // Clean up observers if no trackers are active
    if (this.activeTrackers.size === 0) {
      this.cleanup();
    }
  }

  private initializeObservers(trackFunction: (metric: string, value: number, context?: Record<string, any>) => void): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Navigation timing observer (throttled)
      const navObserver = new PerformanceObserver((list) => {
        if (Date.now() - this.lastTrackTime < this.trackingInterval) return;
        
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            
            if (loadTime > 0) {
              trackFunction('page_load_time_optimized', Math.round(loadTime), {
                metric_type: 'navigation',
                page_url: window.location.pathname,
              });
              this.lastTrackTime = Date.now();
            }
          }
        }
      });

      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);

      // LCP observer (sampled)
      const lcpObserver = new PerformanceObserver((list) => {
        // Sample only 20% of LCP events
        if (Math.random() > 0.2) return;
        
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        trackFunction('largest_contentful_paint_optimized', Math.round(lastEntry.startTime), {
          metric_type: 'core_web_vital',
          page_url: window.location.pathname,
        });
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

    } catch (error) {
      console.warn('Performance observer setup failed:', error);
    }
  }

  private cleanup(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.performanceData.clear();
  }
}

export function OptimizedPerformanceTracker() {
  const { trackPerformance, isEnabled } = usePostHog();
  const trackerId = useRef(`tracker_${Math.random().toString(36).substr(2, 9)}`).current;
  const observerManager = OptimizedPerformanceObserverManager.getInstance();

  // Throttled memory tracking
  const throttledMemoryTracking = useThrottle(true, 60000); // Every minute

  useEffect(() => {
    if (!isEnabled) return;

    // Add this tracker to the manager
    observerManager.addTracker(trackerId, trackPerformance);

    // Cleanup on unmount
    return () => {
      observerManager.removeTracker(trackerId);
    };
  }, [isEnabled, trackerId, trackPerformance, observerManager]);

  // Throttled memory usage tracking
  useEffect(() => {
    if (!isEnabled || !throttledMemoryTracking) return;

    const trackMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        
        // Only track if memory usage is significant
        if (usedMB > 50) {
          trackPerformance('memory_usage_optimized', usedMB, {
            metric_type: 'memory',
            threshold_check: 'high_usage',
          });
        }
      }
    };

    trackMemoryUsage();
  }, [throttledMemoryTracking, trackPerformance, isEnabled]);

  return null;
}
