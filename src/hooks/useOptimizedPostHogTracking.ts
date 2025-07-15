
import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@/contexts/PostHogContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedDebounce, useThrottle, useEventDeduplication } from '@/hooks/useOptimizedDebounce';

// Advanced performance optimization: Smart event throttling
class SmartEventThrottler {
  private lastEvents = new Map<string, number>();
  private readonly minIntervals = {
    page_view: 3000, // 3 seconds between page views
    user_identification: 30000, // 30 seconds between identifications
    click: 1000, // 1 second between clicks
    performance: 10000, // 10 seconds between performance events
    default: 2000
  };

  shouldTrack(eventName: string): boolean {
    const eventType = this.getEventType(eventName);
    const minInterval = this.minIntervals[eventType] || this.minIntervals.default;
    
    const now = Date.now();
    const lastTime = this.lastEvents.get(eventName) || 0;

    if (now - lastTime < minInterval) {
      return false;
    }

    this.lastEvents.set(eventName, now);
    return true;
  }

  private getEventType(eventName: string): string {
    if (eventName.includes('page_view')) return 'page_view';
    if (eventName.includes('identification') || eventName.includes('identify')) return 'user_identification';
    if (eventName.includes('click')) return 'click';
    if (eventName.includes('performance')) return 'performance';
    return 'default';
  }

  cleanup(): void {
    this.lastEvents.clear();
  }
}

export function useOptimizedPostHogTracking() {
  const { track, identify, isEnabled, trackPageView, trackUserJourney } = usePostHog();
  const { user, profile } = useAuth();
  const location = useLocation();
  
  // Optimized throttling and debouncing
  const eventThrottler = useRef(new SmartEventThrottler()).current;
  const lastIdentifiedUser = useRef<string | null>(null);
  const { isDuplicate } = useEventDeduplication();
  
  // Debounced path for page tracking with longer delay
  const debouncedPath = useOptimizedDebounce(location.pathname, 1000);
  
  // Throttled user data to prevent frequent identification updates
  const throttledUser = useThrottle(user?.id, 30000);

  // Optimized page tracking with smart deduplication
  useEffect(() => {
    if (!isEnabled || !eventThrottler.shouldTrack('page_view')) return;
    
    const pageEventKey = `page_view_${debouncedPath}`;
    if (isDuplicate(pageEventKey)) return;
    
    console.log('📍 Optimized page view (debounced):', debouncedPath);
    
    // Minimal page properties for performance
    trackPageView(debouncedPath, {
      user_authenticated: !!user,
      user_type: profile?.user_type || 'anonymous',
    });

    // Throttled funnel tracking (only for key pages)
    const keyPages = ['/', '/account-request', '/dashboard'];
    if (keyPages.includes(debouncedPath)) {
      const funnelEventKey = `funnel_${debouncedPath}`;
      if (!isDuplicate(funnelEventKey)) {
        trackUserJourney(`funnel_${debouncedPath.replace('/', 'home').replace('/', '_')}_optimized`, {
          user_segment: profile?.user_type || 'anonymous',
        });
      }
    }
  }, [debouncedPath, trackPageView, trackUserJourney, isEnabled, user, profile, eventThrottler, isDuplicate]);

  // Optimized user identification with smart throttling
  useEffect(() => {
    if (!isEnabled || !throttledUser || !profile) return;

    // Prevent repeated identification of the same user
    if (lastIdentifiedUser.current === throttledUser) return;
    
    if (!eventThrottler.shouldTrack('user_identification')) return;

    console.log('👤 Optimized user identification (throttled):', throttledUser);
    
    // Minimal user properties for performance
    identify(throttledUser, {
      email: user?.email,
      user_type: profile.user_type,
      access_level: profile.access_level,
      account_status: profile.account_status,
    });
    
    lastIdentifiedUser.current = throttledUser;
  }, [throttledUser, profile, identify, isEnabled, eventThrottler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventThrottler.cleanup();
    };
  }, [eventThrottler]);

  // Optimized tracking functions with built-in throttling
  const trackAuth = {
    login: useCallback((method: string = 'email') => {
      if (eventThrottler.shouldTrack('user_login')) {
        track('user_login_optimized', { method });
      }
    }, [track, eventThrottler]),
    
    logout: useCallback(() => {
      if (eventThrottler.shouldTrack('user_logout')) {
        track('user_logout_optimized', {});
        lastIdentifiedUser.current = null;
      }
    }, [track, eventThrottler]),
    
    signup: useCallback((method: string = 'email') => {
      if (eventThrottler.shouldTrack('user_signup')) {
        track('user_signup_optimized', { method });
      }
    }, [track, eventThrottler]),
    
    accountRequest: useCallback((accountType: string) => {
      if (eventThrottler.shouldTrack('account_request')) {
        track('account_request_optimized', { account_type: accountType });
      }
    }, [track, eventThrottler]),
  };

  const trackTrading = {
    signalCreate: useCallback((signalData: any) => {
      if (eventThrottler.shouldTrack('signal_create')) {
        track('signal_create_optimized', {
          asset_name: signalData.asset_name,
          trade_type: signalData.trade_type,
        });
      }
    }, [track, eventThrottler]),
    
    signalView: useCallback((signalId: string) => {
      const eventKey = `signal_view_${signalId}`;
      if (eventThrottler.shouldTrack(eventKey)) {
        track('signal_view_optimized', { signal_id: signalId });
      }
    }, [track, eventThrottler]),
  };

  const trackEducation = {
    videoStart: useCallback((videoId: string, title: string) => {
      const eventKey = `video_start_${videoId}`;
      if (eventThrottler.shouldTrack(eventKey)) {
        track('video_start_optimized', { 
          video_id: videoId,
          video_title: title.slice(0, 50), // Truncate long titles
        });
      }
    }, [track, eventThrottler]),
    
    videoComplete: useCallback((videoId: string, title: string) => {
      const eventKey = `video_complete_${videoId}`;
      if (eventThrottler.shouldTrack(eventKey)) {
        track('video_complete_optimized', { 
          video_id: videoId,
          video_title: title.slice(0, 50),
        });
      }
    }, [track, eventThrottler]),
  };

  return {
    track: useCallback((event: string, properties?: Record<string, any>) => {
      if (eventThrottler.shouldTrack(event)) {
        track(event, properties);
      }
    }, [track, eventThrottler]),
    trackAuth,
    trackTrading,
    trackEducation,
    isEnabled,
  };
}
