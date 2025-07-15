
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
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

// Performance optimization: Rate limiting for events
class EventRateLimiter {
  private eventCounts = new Map<string, { count: number; lastReset: number }>();
  private readonly maxEventsPerMinute = 30;
  private readonly resetInterval = 60000; // 1 minute

  canTrack(eventName: string): boolean {
    const now = Date.now();
    const eventData = this.eventCounts.get(eventName) || { count: 0, lastReset: now };

    // Reset counter if interval has passed
    if (now - eventData.lastReset > this.resetInterval) {
      eventData.count = 0;
      eventData.lastReset = now;
    }

    if (eventData.count >= this.maxEventsPerMinute) {
      return false;
    }

    eventData.count++;
    this.eventCounts.set(eventName, eventData);
    return true;
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({});
  
  // Performance optimization: Rate limiter instance
  const rateLimiter = new EventRateLimiter();

  useEffect(() => {
    const initializePostHog = async () => {
      try {
        console.log('🚀 Initializing PostHog with performance optimizations...');
        
        const { data, error } = await supabase.functions.invoke('posthog-config');
        
        if (error || !data?.enabled || !data?.apiKey) {
          console.warn('⚠️ PostHog not enabled');
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        console.log('✅ PostHog config loaded');

        // Performance optimized PostHog configuration
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          
          // PERFORMANCE: Disable automatic page views (we'll handle manually)
          capture_pageview: false,
          capture_pageleave: false,
          
          // PERFORMANCE: Optimize network requests
          secure_cookie: true,
          cross_subdomain_cookie: false,
          persistence: 'localStorage',
          
          // PERFORMANCE: Disable session recording for better performance
          disable_session_recording: true,
          
          loaded: (posthog) => {
            console.log('🎯 PostHog loaded with performance optimizations');
            setIsLoaded(true);
            setIsEnabled(true);
            
            // Single initialization event (not a test event)
            posthog.capture('app_initialized', {
              timestamp: new Date().toISOString(),
              performance_mode: 'optimized',
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

  // Performance optimized tracking with rate limiting
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) {
      return;
    }
    
    // Rate limiting check
    if (!rateLimiter.canTrack(event)) {
      console.log('🚫 Event rate limited:', event);
      return;
    }
    
    try {
      // Streamlined properties (reduced payload)
      const optimizedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        // Remove redundant URL properties if already tracked
        ...(properties?.skip_url ? {} : { url: window.location.href }),
      };
      
      posthog.capture(event, optimizedProperties);
    } catch (error) {
      console.error('❌ PostHog tracking error:', error);
    }
  }, [isEnabled, isLoaded, rateLimiter]);

  // Simplified identification without debouncing
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

  // Cached feature flag getter
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

  // Throttled feature flag reload
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
