
import { useEffect } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';

export function PerformanceTracker() {
  const { trackPerformance, isEnabled } = usePostHog();

  useEffect(() => {
    if (!isEnabled) return;

    // Track Core Web Vitals
    const trackWebVitals = () => {
      // Track First Contentful Paint (FCP)
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              trackPerformance('first_contentful_paint', entry.startTime, {
                metric_type: 'core_web_vital',
                page_url: window.location.href,
              });
            }
          }
        });
        
        try {
          observer.observe({ entryTypes: ['paint'] });
        } catch (e) {
          console.warn('Performance observer not supported for paint entries');
        }
      }

      // Track Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          trackPerformance('largest_contentful_paint', lastEntry.startTime, {
            metric_type: 'core_web_vital',
            element: (lastEntry as any).element?.tagName || 'unknown',
            page_url: window.location.href,
          });
        });
        
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          console.warn('Performance observer not supported for LCP');
        }
      }

      // Track Cumulative Layout Shift (CLS)
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          
          trackPerformance('cumulative_layout_shift', clsValue, {
            metric_type: 'core_web_vital',
            page_url: window.location.href,
          });
        });
        
        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          console.warn('Performance observer not supported for layout-shift');
        }
      }

      // Track First Input Delay (FID) when user first interacts
      const trackFID = (event: Event) => {
        const now = performance.now();
        const eventTime = event.timeStamp;
        const delay = now - eventTime;
        
        trackPerformance('first_input_delay', delay, {
          metric_type: 'core_web_vital',
          event_type: event.type,
          page_url: window.location.href,
        });
        
        // Remove listeners after first interaction
        window.removeEventListener('click', trackFID);
        window.removeEventListener('keydown', trackFID);
        window.removeEventListener('touchstart', trackFID);
      };
      
      window.addEventListener('click', trackFID, { once: true });
      window.addEventListener('keydown', trackFID, { once: true });
      window.addEventListener('touchstart', trackFID, { once: true });
    };

    // Track page load performance
    const trackPageLoad = () => {
      if ('performance' in window && 'timing' in performance) {
        const timing = performance.timing;
        
        trackPerformance('page_load_total', timing.loadEventEnd - timing.navigationStart, {
          metric_type: 'page_load',
          dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcp_connection: timing.connectEnd - timing.connectStart,
          server_response: timing.responseEnd - timing.requestStart,
          dom_processing: timing.domComplete - timing.domLoading,
          page_url: window.location.href,
        });
      }
    };

    // Track memory usage if available
    const trackMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        trackPerformance('memory_usage', memory.usedJSHeapSize, {
          metric_type: 'memory',
          total_heap_size: memory.totalJSHeapSize,
          heap_size_limit: memory.jsHeapSizeLimit,
          page_url: window.location.href,
        });
      }
    };

    // Track network connection quality
    const trackNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        trackPerformance('network_speed', connection.downlink || 0, {
          metric_type: 'network',
          connection_type: connection.effectiveType,
          save_data: connection.saveData,
          page_url: window.location.href,
        });
      }
    };

    // Run tracking functions
    setTimeout(trackWebVitals, 0);
    setTimeout(trackPageLoad, 100);
    setTimeout(trackMemoryUsage, 1000);
    setTimeout(trackNetworkInfo, 0);

    // Track performance periodically
    const performanceInterval = setInterval(() => {
      trackMemoryUsage();
      trackNetworkInfo();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(performanceInterval);
    };
  }, [trackPerformance, isEnabled]);

  return null;
}
