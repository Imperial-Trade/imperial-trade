
import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@/contexts/PostHogContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';

// Performance optimization: Event throttling
class EventThrottler {
  private lastEvents = new Map<string, number>();
  private readonly minInterval = 2000; // 2 seconds minimum between same events

  shouldTrack(eventName: string): boolean {
    const now = Date.now();
    const lastTime = this.lastEvents.get(eventName) || 0;

    if (now - lastTime < this.minInterval) {
      return false;
    }

    this.lastEvents.set(eventName, now);
    return true;
  }
}

export function useOptimizedPostHogTracking() {
  const { track, identify, reset, isEnabled } = usePostHog();
  const { user, profile } = useAuth();
  const location = useLocation();
  
  // Performance optimization: Throttle events
  const eventThrottler = useRef(new EventThrottler()).current;
  const lastIdentifiedUser = useRef<string | null>(null);
  
  // Debounced location for page tracking
  const debouncedPath = useDebounce(location.pathname, 1000);

  // Performance optimized page tracking (throttled and debounced)
  useEffect(() => {
    if (!isEnabled || !eventThrottler.shouldTrack('page_view')) return;
    
    console.log('📍 Optimized page view:', debouncedPath);
    
    // Streamlined page properties
    const pageProperties = {
      path: debouncedPath,
      user_authenticated: !!user,
      skip_url: true, // Skip redundant URL in properties
    };

    // Single enhanced page view event
    track('page_view_enhanced', pageProperties);

    // Track specific funnel entry points (throttled)
    if (debouncedPath === '/') {
      track('funnel_landing_page_visit', { skip_url: true });
    } else if (debouncedPath === '/account-request') {
      track('funnel_account_request_page_visit', { skip_url: true });
    }
  }, [debouncedPath, track, isEnabled, user, eventThrottler]);

  // Performance optimized user identification (only once per user)
  useEffect(() => {
    if (!isEnabled || !user || !profile) return;

    // Prevent repeated identification of the same user
    if (lastIdentifiedUser.current === user.id) return;

    console.log('👤 Optimized user identification:', user.id);
    
    // Streamlined user properties
    identify(user.id, {
      email: user.email,
      user_type: profile.user_type,
      access_level: profile.access_level,
      account_status: profile.account_status,
    });
    
    lastIdentifiedUser.current = user.id;
    
    // Single session start event
    track('user_session_start', {
      user_type: profile.user_type,
      skip_url: true,
    });
  }, [user, profile, identify, track, reset, isEnabled]);

  // Performance optimized tracking functions
  const trackAuth = {
    login: useCallback((method: string = 'email') => {
      if (eventThrottler.shouldTrack('user_login')) {
        track('user_login', { method, skip_url: true });
      }
    }, [track, eventThrottler]),
    
    logout: useCallback(() => {
      if (eventThrottler.shouldTrack('user_logout')) {
        track('user_logout', { skip_url: true });
        lastIdentifiedUser.current = null; // Reset for next session
      }
    }, [track, eventThrottler]),
    
    signup: useCallback((method: string = 'email') => {
      if (eventThrottler.shouldTrack('user_signup')) {
        track('user_signup', { method, skip_url: true });
      }
    }, [track, eventThrottler]),
    
    accountRequest: useCallback((accountType: string) => {
      if (eventThrottler.shouldTrack('account_request_submitted')) {
        track('account_request_submitted', { account_type: accountType, skip_url: true });
      }
    }, [track, eventThrottler]),
  };

  const trackTrading = {
    signalCreate: useCallback((signalData: any) => {
      if (eventThrottler.shouldTrack('trade_signal_created')) {
        track('trade_signal_created', {
          asset_name: signalData.asset_name,
          trade_type: signalData.trade_type,
          skip_url: true,
        });
      }
    }, [track, eventThrottler]),
    
    signalView: useCallback((signalId: string) => {
      if (eventThrottler.shouldTrack(`signal_view_${signalId}`)) {
        track('trade_signal_viewed', { 
          signal_id: signalId,
          skip_url: true,
        });
      }
    }, [track, eventThrottler]),
  };

  const trackEducation = {
    videoStart: useCallback((videoId: string, title: string) => {
      if (eventThrottler.shouldTrack(`video_start_${videoId}`)) {
        track('education_video_started', { 
          video_id: videoId,
          video_title: title,
          skip_url: true,
        });
      }
    }, [track, eventThrottler]),
    
    videoComplete: useCallback((videoId: string, title: string) => {
      if (eventThrottler.shouldTrack(`video_complete_${videoId}`)) {
        track('education_video_completed', { 
          video_id: videoId,
          video_title: title,
          skip_url: true,
        });
      }
    }, [track, eventThrottler]),
  };

  return {
    track: useCallback((event: string, properties?: Record<string, any>) => {
      if (eventThrottler.shouldTrack(event)) {
        track(event, { ...properties, skip_url: true });
      }
    }, [track, eventThrottler]),
    trackAuth,
    trackTrading,
    trackEducation,
    isEnabled,
  };
}
