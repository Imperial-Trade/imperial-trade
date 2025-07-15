import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';
import { optimizedEventBatcher } from '@/services/OptimizedEventBatchingService';

interface PostHogContextType {
  isLoaded: boolean;
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  isEnabled: boolean;
  getFeatureFlag: (flag: string) => boolean | string | undefined;
  onFeatureFlags: (callback: (flags: Record<string, boolean | string>) => void) => void;
  reloadFeatureFlags: () => void;
  // Optimized comprehensive tracking methods
  trackPageView: (path: string, properties?: Record<string, any>) => void;
  trackClick: (element: string, properties?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackPerformance: (metric: string, value: number, context?: Record<string, any>) => void;
  trackUserJourney: (step: string, properties?: Record<string, any>) => void;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

// Optimized rate limiting with conservative limits
class OptimizedEventRateLimiter {
  private eventCounts = new Map<string, { count: number; lastReset: number }>();
  private readonly limits = {
    // Very conservative limits to prevent performance impact
    page_view: { maxEventsPerMinute: 5, resetInterval: 60000 },
    click: { maxEventsPerMinute: 10, resetInterval: 60000 },
    error: { maxEventsPerMinute: 8, resetInterval: 60000 },
    performance: { maxEventsPerMinute: 3, resetInterval: 60000 },
    user_journey: { maxEventsPerMinute: 6, resetInterval: 60000 },
    default: { maxEventsPerMinute: 10, resetInterval: 60000 }
  };

  canTrack(eventName: string): boolean {
    const eventType = this.getEventType(eventName);
    const limit = this.limits[eventType] || this.limits.default;
    
    const now = Date.now();
    const eventData = this.eventCounts.get(eventName) || { count: 0, lastReset: now };

    // Reset counter if interval has passed
    if (now - eventData.lastReset > limit.resetInterval) {
      eventData.count = 0;
      eventData.lastReset = now;
    }

    if (eventData.count >= limit.maxEventsPerMinute) {
      return false;
    }

    eventData.count++;
    this.eventCounts.set(eventName, eventData);
    return true;
  }

  private getEventType(eventName: string): string {
    if (eventName.includes('page_view')) return 'page_view';
    if (eventName.includes('click') || eventName.includes('button')) return 'click';
    if (eventName.includes('error')) return 'error';
    if (eventName.includes('performance')) return 'performance';
    if (eventName.includes('journey') || eventName.includes('funnel')) return 'user_journey';
    return 'default';
  }

  // Cleanup method for memory management
  cleanup(): void {
    this.eventCounts.clear();
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({});
  
  // Optimized rate limiter with conservative limits
  const rateLimiter = new OptimizedEventRateLimiter();

  useEffect(() => {
    const initializePostHog = async () => {
      try {
        console.log('🚀 Initializing optimized PostHog...');
        
        const { data, error } = await supabase.functions.invoke('posthog-config');
        
        if (error || !data?.enabled || !data?.apiKey) {
          console.warn('⚠️ PostHog not enabled');
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        console.log('✅ PostHog config loaded - optimized mode');

        // Conservative PostHog configuration for optimal performance
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          
          // Start with minimal auto-capture to reduce overhead
          capture_pageview: false, // We'll handle this manually with debouncing
          capture_pageleave: false, // Reduce event volume
          
          // Performance-focused settings
          secure_cookie: true,
          cross_subdomain_cookie: false,
          persistence: 'localStorage',
          
          // Disable session recording initially for performance
          disable_session_recording: true,
          
          // Optimize network requests - removed invalid batch_size property
          request_timeout: 30000,
          
          // Conservative properties capture
          property_blacklist: [
            '$password', '$email', '$phone', 'password', 'email', 'phone',
            'ssn', 'social_security', 'credit_card', 'bank_account'
          ],
          
          loaded: (posthog) => {
            console.log('🎯 PostHog loaded - optimized configuration');
            setIsLoaded(true);
            setIsEnabled(true);
            
            // Set up event batching
            optimizedEventBatcher.setTrackFunction((event, properties) => {
              posthog.capture(event, properties);
            });
            
            // Minimal initialization event
            optimizedEventBatcher.queueEvent('app_initialized_optimized', {
              tracking_mode: 'optimized',
              performance_focused: true,
            });
          },
        });

      } catch (error) {
        console.error('💥 PostHog initialization error:', error);
        setIsEnabled(false);
        setIsLoaded(true);
      }
    };

    initializePostHog();

    // Cleanup on unmount
    return () => {
      rateLimiter.cleanup();
      optimizedEventBatcher.cleanup();
    };
  }, []);

  // Optimized tracking with batching and rate limiting
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    if (!rateLimiter.canTrack(event)) {
      console.log('🚫 Event rate limited:', event);
      return;
    }
    
    try {
      // Minimal properties to reduce payload size
      const optimizedProperties = {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        // Remove heavy properties that cause frequent updates
        // user_agent: navigator.userAgent, // Only include when needed
        // screen_resolution: `${window.screen.width}x${window.screen.height}`,
      };
      
      optimizedEventBatcher.queueEvent(event, optimizedProperties);
      console.log('📊 Event queued for batching:', event);
    } catch (error) {
      console.error('❌ PostHog tracking error:', error);
    }
  }, [isEnabled, isLoaded]);

  // Optimized page view tracking with reduced properties
  const trackPageView = useCallback((path: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('optimized_page_view', {
      ...properties,
      page_path: path,
      // Minimal properties for performance
    });
  }, [track, isEnabled, isLoaded]);

  // Optimized click tracking
  const trackClick = useCallback((element: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('optimized_click', {
      ...properties,
      element_type: element,
      // Minimal properties for performance
    });
  }, [track, isEnabled, isLoaded]);

  // Optimized error tracking
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('optimized_error', {
      ...context,
      error_name: error.name,
      error_message: error.message,
      // Only include stack trace for critical errors
      ...(context?.critical && { error_stack: error.stack }),
    });
  }, [track, isEnabled, isLoaded]);

  // Optimized performance tracking with sampling
  const trackPerformance = useCallback((metric: string, value: number, context?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    // Sample performance events (only track 1 in 3)
    if (Math.random() > 0.33) return;
    
    track('optimized_performance', {
      ...context,
      performance_metric: metric,
      performance_value: Math.round(value), // Round to reduce precision
    });
  }, [track, isEnabled, isLoaded]);

  // Optimized user journey tracking
  const trackUserJourney = useCallback((step: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('optimized_user_journey', {
      ...properties,
      journey_step: step,
    });
  }, [track, isEnabled, isLoaded]);

  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) {
      return;
    }
    
    try {
      console.log('👤 Identifying user:', userId);
      posthog.identify(userId, {
        ...properties,
        identified_at: new Date().toISOString(),
      });
      
      // Smart feature flag reload (only after identification)
      setTimeout(() => {
        posthog.reloadFeatureFlags();
      }, 1000);
    } catch (error) {
      console.error('❌ PostHog identify error:', error);
    }
  }, [isEnabled, isLoaded]);

  const reset = useCallback(() => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      console.log('🔄 Resetting PostHog');
      posthog.reset();
      setFeatureFlags({});
    } catch (error) {
      console.error('❌ PostHog reset error:', error);
    }
  }, [isEnabled, isLoaded]);

  const getFeatureFlag = useCallback((flag: string): boolean | string | undefined => {
    if (!isEnabled || !isLoaded) return undefined;
    
    try {
      return posthog.getFeatureFlag(flag);
    } catch (error) {
      console.error('❌ PostHog getFeatureFlag error:', error);
      return undefined;
    }
  }, [isEnabled, isLoaded]);

  const onFeatureFlags = useCallback((callback: (flags: Record<string, boolean | string>) => void) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.onFeatureFlags(() => {
        const updatedFlags = { ...featureFlags };
        setFeatureFlags(updatedFlags);
        callback(updatedFlags);
      });
    } catch (error) {
      console.error('❌ PostHog onFeatureFlags error:', error);
    }
  }, [isEnabled, isLoaded, featureFlags]);

  const reloadFeatureFlags = useCallback(() => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error('❌ PostHog reloadFeatureFlags error:', error);
    }
  }, [isEnabled, isLoaded]);

  return (
    <PostHogContext.Provider value={{ 
      isLoaded, 
      track, 
      identify, 
      reset, 
      isEnabled,
      getFeatureFlag,
      onFeatureFlags,
      reloadFeatureFlags,
      // Optimized comprehensive tracking methods
      trackPageView,
      trackClick,
      trackError,
      trackPerformance,
      trackUserJourney,
    }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}
