import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

interface PostHogContextType {
  isLoaded: boolean;
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  isEnabled: boolean;
  getFeatureFlag: (flag: string) => boolean | string | undefined;
  onFeatureFlags: (callback: (flags: Record<string, boolean | string>) => void) => void;
  reloadFeatureFlags: () => void;
  // New comprehensive tracking methods
  trackPageView: (path: string, properties?: Record<string, any>) => void;
  trackClick: (element: string, properties?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackPerformance: (metric: string, value: number, context?: Record<string, any>) => void;
  trackUserJourney: (step: string, properties?: Record<string, any>) => void;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

// Enhanced rate limiting for comprehensive tracking
class ComprehensiveEventRateLimiter {
  private eventCounts = new Map<string, { count: number; lastReset: number }>();
  private readonly limits = {
    // High-frequency events (more restrictive)
    click: { maxEventsPerMinute: 20, resetInterval: 60000 },
    scroll: { maxEventsPerMinute: 10, resetInterval: 60000 },
    hover: { maxEventsPerMinute: 15, resetInterval: 60000 },
    
    // Medium-frequency events
    page_view: { maxEventsPerMinute: 30, resetInterval: 60000 },
    form_interaction: { maxEventsPerMinute: 25, resetInterval: 60000 },
    
    // Low-frequency events (less restrictive)
    error: { maxEventsPerMinute: 50, resetInterval: 60000 },
    performance: { maxEventsPerMinute: 40, resetInterval: 60000 },
    user_journey: { maxEventsPerMinute: 35, resetInterval: 60000 },
    
    // Business events (preserve existing limits)
    default: { maxEventsPerMinute: 30, resetInterval: 60000 }
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
    if (eventName.includes('click') || eventName.includes('button')) return 'click';
    if (eventName.includes('scroll')) return 'scroll';
    if (eventName.includes('hover')) return 'hover';
    if (eventName.includes('page_view')) return 'page_view';
    if (eventName.includes('form') || eventName.includes('input')) return 'form_interaction';
    if (eventName.includes('error')) return 'error';
    if (eventName.includes('performance')) return 'performance';
    if (eventName.includes('journey') || eventName.includes('funnel')) return 'user_journey';
    return 'default';
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({});
  
  // Enhanced rate limiter for comprehensive tracking
  const rateLimiter = new ComprehensiveEventRateLimiter();

  useEffect(() => {
    const initializePostHog = async () => {
      try {
        console.log('🚀 Initializing PostHog with comprehensive tracking...');
        
        const { data, error } = await supabase.functions.invoke('posthog-config');
        
        if (error || !data?.enabled || !data?.apiKey) {
          console.warn('⚠️ PostHog not enabled');
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        console.log('✅ PostHog config loaded for comprehensive tracking');

        // Enhanced PostHog configuration for comprehensive tracking
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          
          // PHASE 1: Start with selective auto-capture (safe approach)
          capture_pageview: true, // Enable automatic page view tracking
          capture_pageleave: true, // Track when users leave pages
          
          // Enhanced tracking options
          secure_cookie: true,
          cross_subdomain_cookie: false,
          persistence: 'localStorage',
          
          // Start with session recording disabled (will enable in Phase 3)
          disable_session_recording: true,
          
          // Enhanced properties capture
          property_blacklist: [
            // Exclude sensitive data
            '$password', '$email', '$phone', 'password', 'email', 'phone',
            'ssn', 'social_security', 'credit_card', 'bank_account'
          ],
          
          loaded: (posthog) => {
            console.log('🎯 PostHog loaded with comprehensive tracking ready');
            setIsLoaded(true);
            setIsEnabled(true);
            
            // Enhanced initialization event
            posthog.capture('app_initialized_comprehensive', {
              timestamp: new Date().toISOString(),
              tracking_mode: 'comprehensive',
              phase: 'phase_1_foundation',
              user_agent: navigator.userAgent,
              screen_resolution: `${window.screen.width}x${window.screen.height}`,
              viewport_size: `${window.innerWidth}x${window.innerHeight}`,
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
  }, []);

  // Enhanced tracking with comprehensive context
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) {
      return;
    }
    
    if (!rateLimiter.canTrack(event)) {
      console.log('🚫 Event rate limited:', event);
      return;
    }
    
    try {
      const enhancedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        connection_type: (navigator as any).connection?.effectiveType || 'unknown',
        page_title: document.title,
      };
      
      posthog.capture(event, enhancedProperties);
      console.log('📊 Enhanced event tracked:', event);
    } catch (error) {
      console.error('❌ PostHog tracking error:', error);
    }
  }, [isEnabled, isLoaded, rateLimiter]);

  // New: Enhanced page view tracking
  const trackPageView = useCallback((path: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('comprehensive_page_view', {
      ...properties,
      page_path: path,
      page_title: document.title,
      page_load_time: performance.now(),
      session_duration: Date.now() - performance.timeOrigin,
    });
  }, [track, isEnabled, isLoaded]);

  // New: Click tracking with context
  const trackClick = useCallback((element: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('comprehensive_click', {
      ...properties,
      element_type: element,
      click_timestamp: Date.now(),
    });
  }, [track, isEnabled, isLoaded]);

  // New: Error tracking with full context
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('comprehensive_error', {
      ...context,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      error_timestamp: Date.now(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
  }, [track, isEnabled, isLoaded]);

  // New: Performance tracking
  const trackPerformance = useCallback((metric: string, value: number, context?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('comprehensive_performance', {
      ...context,
      performance_metric: metric,
      performance_value: value,
      performance_timestamp: Date.now(),
    });
  }, [track, isEnabled, isLoaded]);

  // New: User journey tracking
  const trackUserJourney = useCallback((step: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    track('comprehensive_user_journey', {
      ...properties,
      journey_step: step,
      step_timestamp: Date.now(),
      session_id: posthog.get_session_id(),
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
      // New comprehensive tracking methods
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
