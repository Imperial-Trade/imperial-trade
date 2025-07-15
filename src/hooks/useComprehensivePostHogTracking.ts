
import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@/contexts/PostHogContext';
import { useAuth } from '@/contexts/AuthContext';

// Comprehensive tracking hook that safely extends existing functionality
export function useComprehensivePostHogTracking() {
  const { 
    track, 
    identify, 
    reset, 
    isEnabled,
    trackPageView,
    trackClick,
    trackError,
    trackPerformance,
    trackUserJourney
  } = usePostHog();
  const { user, profile } = useAuth();
  const location = useLocation();
  
  const lastIdentifiedUser = useRef<string | null>(null);
  const sessionStartTime = useRef(Date.now());
  
  // Enhanced page tracking with comprehensive context
  useEffect(() => {
    if (!isEnabled) return;
    
    console.log('📍 Comprehensive page view:', location.pathname);
    
    // Enhanced page view with full context
    trackPageView(location.pathname, {
      page_path: location.pathname,
      page_search: location.search,
      page_hash: location.hash,
      user_authenticated: !!user,
      user_type: profile?.user_type || 'anonymous',
      access_level: profile?.access_level || 'none',
      account_status: profile?.account_status || 'unknown',
      session_duration: Date.now() - sessionStartTime.current,
      page_load_timestamp: Date.now(),
    });

    // Enhanced funnel tracking with comprehensive context
    const funnelEvents = {
      '/': 'funnel_landing_page_comprehensive',
      '/account-request': 'funnel_account_request_comprehensive',
      '/signin': 'funnel_signin_page_comprehensive',
      '/dashboard': 'funnel_dashboard_entry_comprehensive',
      '/dashboard/education': 'funnel_education_entry_comprehensive',
      '/dashboard/signals': 'funnel_signals_entry_comprehensive',
      '/dashboard/signal-stream': 'funnel_signal_stream_comprehensive',
      '/dashboard/advanced-tools': 'funnel_advanced_tools_comprehensive',
      '/dashboard/admin': 'funnel_admin_entry_comprehensive',
    };

    const funnelEvent = funnelEvents[location.pathname as keyof typeof funnelEvents];
    if (funnelEvent) {
      trackUserJourney(funnelEvent, {
        page_category: location.pathname.startsWith('/dashboard') ? 'dashboard' : 'landing',
        user_segment: profile?.user_type || 'anonymous',
        entry_method: document.referrer ? 'referral' : 'direct',
        previous_page: document.referrer,
      });
    }
  }, [location.pathname, location.search, location.hash, trackPageView, trackUserJourney, isEnabled, user, profile]);

  // Enhanced user identification with comprehensive profile data
  useEffect(() => {
    if (!isEnabled || !user || !profile) return;

    // Prevent repeated identification of the same user
    if (lastIdentifiedUser.current === user.id) return;

    console.log('👤 Comprehensive user identification:', user.id);
    
    // Enhanced user properties for comprehensive tracking
    identify(user.id, {
      email: user.email,
      display_name: profile.display_name,
      user_type: profile.user_type,
      access_level: profile.access_level,
      account_status: profile.account_status,
      registration_source: profile.registration_source,
      created_at: profile.created_at,
      last_login: profile.last_login,
      phone_number: profile.phone_number,
      // Enhanced tracking properties
      is_approved_user: profile.account_status === 'active',
      has_completed_onboarding: profile.last_login !== null,
      user_journey_stage: getUserJourneyStage(profile),
      account_age_days: profile.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      session_count: 1, // This could be enhanced with actual session tracking
      identification_timestamp: Date.now(),
    });
    
    lastIdentifiedUser.current = user.id;
    
    // Enhanced session start tracking
    trackUserJourney('user_session_start_comprehensive', {
      user_type: profile.user_type,
      access_level: profile.access_level,
      account_status: profile.account_status,
      session_start_method: 'identification',
      device_info: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookie_enabled: navigator.cookieEnabled,
        online: navigator.onLine,
      },
    });
  }, [user, profile, identify, trackUserJourney, isEnabled]);

  // Helper function for user journey stage
  const getUserJourneyStage = (profile: any) => {
    if (!profile) return 'anonymous';
    if (profile.account_status === 'pending') return 'requested_access';
    if (profile.account_status === 'active' && !profile.last_login) return 'approved_not_activated';
    if (profile.account_status === 'active' && profile.last_login) return 'active_user';
    return 'unknown';
  };

  // Enhanced authentication event tracking
  const trackAuth = {
    login: useCallback((method: string = 'email') => {
      track('user_login_comprehensive', { 
        method, 
        timestamp: Date.now(),
        login_page: location.pathname,
        device_info: navigator.userAgent,
      });
      trackUserJourney('funnel_login_completed_comprehensive', { 
        method, 
        user_type: profile?.user_type,
        completion_time: Date.now(),
      });
    }, [track, trackUserJourney, location.pathname, profile]),
    
    logout: useCallback(() => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      track('user_logout_comprehensive', { 
        timestamp: Date.now(),
        session_duration: sessionDuration,
        logout_page: location.pathname,
      });
      trackUserJourney('user_session_end_comprehensive', {
        session_duration: sessionDuration,
        pages_visited: 1, // This could be enhanced with actual page count
      });
      lastIdentifiedUser.current = null;
    }, [track, trackUserJourney, location.pathname]),
    
    signup: useCallback((method: string = 'email') => {
      track('user_signup_comprehensive', { 
        method, 
        timestamp: Date.now(),
        signup_page: location.pathname,
        referrer: document.referrer,
      });
      trackUserJourney('funnel_signup_completed_comprehensive', { 
        method,
        signup_source: document.referrer || 'direct',
      });
    }, [track, trackUserJourney, location.pathname]),
    
    accountRequest: useCallback((accountType: string) => {
      track('account_request_submitted_comprehensive', { 
        account_type: accountType, 
        timestamp: Date.now(),
        request_page: location.pathname,
        form_completion_time: Date.now() - sessionStartTime.current,
      });
      trackUserJourney('funnel_account_request_submitted_comprehensive', { 
        account_type: accountType,
        conversion_time: Date.now() - sessionStartTime.current,
      });
    }, [track, trackUserJourney, location.pathname]),
  };

  // Enhanced trading event tracking
  const trackTrading = {
    signalCreate: useCallback((signalData: any) => {
      track('trade_signal_created_comprehensive', {
        asset_name: signalData.asset_name,
        trade_type: signalData.trade_type,
        entry_price: signalData.entry_price,
        timestamp: Date.now(),
        creation_page: location.pathname,
        user_experience_level: profile?.user_type,
      });
      trackUserJourney('funnel_signal_created_comprehensive', {
        asset_name: signalData.asset_name,
        is_first_signal: signalData.is_first_signal,
        user_type: profile?.user_type,
        creation_method: 'manual',
      });
    }, [track, trackUserJourney, location.pathname, profile]),
    
    signalView: useCallback((signalId: string, signalData?: any) => {
      track('trade_signal_viewed_comprehensive', { 
        signal_id: signalId, 
        timestamp: Date.now(),
        view_page: location.pathname,
        signal_age: signalData?.created_at ? Date.now() - new Date(signalData.created_at).getTime() : null,
      });
      trackUserJourney('funnel_signal_viewed_comprehensive', { 
        signal_id: signalId,
        signal_type: signalData?.trade_type,
        from_educator: signalData?.user_type === 'educator',
        view_context: location.pathname.includes('stream') ? 'stream' : 'individual',
      });
    }, [track, trackUserJourney, location.pathname]),
    
    signalCopy: useCallback((signalId: string) => {
      track('trade_signal_copied_comprehensive', { 
        signal_id: signalId, 
        timestamp: Date.now(),
        copy_page: location.pathname,
      });
      trackUserJourney('funnel_signal_copied_comprehensive', { 
        signal_id: signalId,
        copy_method: 'click',
      });
    }, [track, trackUserJourney, location.pathname]),
  };

  // Enhanced education event tracking
  const trackEducation = {
    videoStart: useCallback((videoId: string, title: string) => {
      track('education_video_started_comprehensive', { 
        video_id: videoId, 
        video_title: title,
        timestamp: Date.now(),
        start_page: location.pathname,
        user_level: profile?.access_level,
      });
      trackUserJourney('funnel_education_video_started_comprehensive', { 
        video_id: videoId, 
        video_title: title,
        is_first_video: false, // This could be enhanced with actual tracking
        user_engagement_level: 'starter',
      });
    }, [track, trackUserJourney, location.pathname, profile]),
    
    videoProgress: useCallback((videoId: string, title: string, percentage: number) => {
      track('education_video_progress_comprehensive', { 
        video_id: videoId, 
        video_title: title,
        progress_percentage: percentage,
        timestamp: Date.now(),
      });
      
      // Track key engagement milestones
      const milestones = [25, 50, 75, 100];
      if (milestones.includes(percentage)) {
        trackUserJourney(`funnel_video_${percentage}_percent_comprehensive`, { 
          video_id: videoId,
          engagement_quality: percentage >= 75 ? 'high' : percentage >= 50 ? 'medium' : 'low',
        });
      }
    }, [track, trackUserJourney]),
    
    videoComplete: useCallback((videoId: string, title: string) => {
      track('education_video_completed_comprehensive', { 
        video_id: videoId, 
        video_title: title,
        timestamp: Date.now(),
        completion_page: location.pathname,
      });
      trackUserJourney('funnel_education_video_completed_comprehensive', { 
        video_id: videoId, 
        video_title: title,
        completion_rate: 100,
        engagement_score: 'high',
      });
    }, [track, trackUserJourney, location.pathname]),
  };

  // Enhanced tools tracking
  const trackTools = {
    calculatorUse: useCallback((calculatorType: string) => {
      track('calculator_used_comprehensive', { 
        calculator_type: calculatorType,
        timestamp: Date.now(),
        usage_page: location.pathname,
        user_level: profile?.access_level,
      });
      trackUserJourney('funnel_advanced_tool_used_comprehensive', { 
        tool_type: calculatorType,
        usage_context: 'calculation',
        user_sophistication: profile?.user_type === 'educator' ? 'advanced' : 'standard',
      });
    }, [track, trackUserJourney, location.pathname, profile]),
    
    economicCalendarView: useCallback(() => {
      track('economic_calendar_viewed_comprehensive', {
        timestamp: Date.now(),
        view_page: location.pathname,
      });
      trackUserJourney('funnel_advanced_tool_used_comprehensive', { 
        tool_type: 'economic_calendar',
        usage_context: 'analysis',
        feature_sophistication: 'advanced',
      });
    }, [track, trackUserJourney, location.pathname]),
  };

  // Performance monitoring integration
  const trackPagePerformance = useCallback(() => {
    if (!isEnabled) return;
    
    // Track Core Web Vitals and other performance metrics
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            trackPerformance('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart, {
              page: location.pathname,
              connection_type: (navigator as any).connection?.effectiveType || 'unknown',
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      // Cleanup observer after a short time
      setTimeout(() => observer.disconnect(), 5000);
    }
  }, [trackPerformance, isEnabled, location.pathname]);

  useEffect(() => {
    trackPagePerformance();
  }, [trackPagePerformance]);

  return {
    track: useCallback((event: string, properties?: Record<string, any>) => {
      track(event, { 
        ...properties, 
        comprehensive_tracking: true,
        tracking_timestamp: Date.now(),
        page_context: location.pathname,
      });
    }, [track, location.pathname]),
    trackClick,
    trackError,
    trackPerformance,
    trackUserJourney,
    trackAuth,
    trackTrading,
    trackEducation,
    trackTools,
    isEnabled,
  };
}
