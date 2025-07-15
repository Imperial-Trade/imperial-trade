import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@/contexts/PostHogContext';
import { useAuth } from '@/contexts/AuthContext';

export function usePostHogTracking() {
  const { track, identify, reset, isEnabled, getFeatureFlag, onFeatureFlags } = usePostHog();
  const { user, profile } = useAuth();
  const location = useLocation();

  // Track page views automatically (PostHog handles this, but we can add custom properties)
  useEffect(() => {
    if (!isEnabled) return;
    
    console.log('📍 Page view:', location.pathname);
    
    // Add custom page view properties
    const pageProperties = {
      path: location.pathname,
      user_type: profile?.user_type || 'anonymous',
      access_level: profile?.access_level || 'free',
      user_authenticated: !!user,
    };

    // Track custom page view event with additional context
    track('page_view_enhanced', pageProperties);

    // Track specific funnel entry points
    if (location.pathname === '/') {
      track('funnel_landing_page_visit', pageProperties);
    } else if (location.pathname === '/account-request') {
      track('funnel_account_request_page_visit', pageProperties);
    } else if (location.pathname.startsWith('/dashboard/education')) {
      track('funnel_education_page_visit', pageProperties);
    } else if (location.pathname.startsWith('/dashboard/signals')) {
      track('funnel_signals_page_visit', pageProperties);
    } else if (location.pathname.startsWith('/dashboard/admin')) {
      track('funnel_admin_page_visit', pageProperties);
    }
  }, [location.pathname, track, isEnabled, profile, user]);

  // Handle user identification
  useEffect(() => {
    if (!isEnabled) return;

    if (user && profile) {
      console.log('👤 Identifying authenticated user:', user.id);
      identify(user.id, {
        email: user.email,
        display_name: profile.display_name,
        user_type: profile.user_type,
        access_level: profile.access_level,
        account_status: profile.account_status,
        registration_source: profile.registration_source,
        created_at: profile.created_at,
        // Enhanced user properties
        is_approved_user: profile.account_status === 'active',
        has_completed_onboarding: profile.last_login !== null,
        user_journey_stage: getUserJourneyStage(profile),
        last_login: profile.last_login,
      });
      
      // Track user session start
      track('user_session_start', {
        user_type: profile.user_type,
        access_level: profile.access_level,
        session_start_time: new Date().toISOString(),
      });
    } else {
      console.log('👤 User not authenticated, tracking as anonymous');
      // Track anonymous user activity
      track('anonymous_user_activity', {
        page: location.pathname,
        timestamp: new Date().toISOString(),
      });
    }
  }, [user, profile, identify, track, reset, isEnabled, location.pathname]);

  // Helper function to determine user journey stage
  const getUserJourneyStage = (profile: any) => {
    if (!profile) return 'anonymous';
    if (profile.account_status === 'pending') return 'requested_access';
    if (profile.account_status === 'active' && !profile.last_login) return 'approved_not_activated';
    if (profile.account_status === 'active' && profile.last_login) return 'active_user';
    return 'unknown';
  };

  // Enhanced authentication event tracking
  const trackAuth = {
    login: (method: string = 'email') => {
      track('user_login', { method, timestamp: new Date().toISOString() });
      track('funnel_login_completed', { method, user_type: profile?.user_type });
    },
    logout: () => {
      track('user_logout', { timestamp: new Date().toISOString() });
    },
    signup: (method: string = 'email') => {
      track('user_signup', { method, timestamp: new Date().toISOString() });
      track('funnel_signup_completed', { method });
    },
    accountRequest: (accountType: string) => {
      track('account_request_submitted', { account_type: accountType, timestamp: new Date().toISOString() });
      track('funnel_account_request_submitted', { account_type: accountType });
    },
    accountApproved: (accountType: string) => {
      track('funnel_account_approved', { account_type: accountType, timestamp: new Date().toISOString() });
    },
    firstLogin: () => {
      track('funnel_first_login', { user_type: profile?.user_type, timestamp: new Date().toISOString() });
    },
  };

  const trackTrading = {
    signalCreate: (signalData: any) => {
      track('trade_signal_created', {
        asset_name: signalData.asset_name,
        trade_type: signalData.trade_type,
        entry_price: signalData.entry_price,
        timestamp: new Date().toISOString(),
      });
      track('funnel_signal_created', {
        asset_name: signalData.asset_name,
        is_first_signal: signalData.is_first_signal,
        user_type: profile?.user_type,
      });
    },
    signalView: (signalId: string, signalData?: any) => {
      track('trade_signal_viewed', { 
        signal_id: signalId, 
        timestamp: new Date().toISOString() 
      });
      track('funnel_signal_viewed', { 
        signal_id: signalId,
        signal_type: signalData?.trade_type,
        from_educator: signalData?.user_type === 'educator',
      });
    },
    signalFollow: (signalId: string) => {
      track('trade_signal_followed', { 
        signal_id: signalId, 
        timestamp: new Date().toISOString() 
      });
      track('funnel_signal_followed', { signal_id: signalId });
    },
    signalShare: (signalId: string) => {
      track('trade_signal_shared', { signal_id: signalId });
    },
    liveSessionJoin: (sessionId: string) => {
      track('live_session_joined', { session_id: sessionId });
      track('funnel_live_session_joined', { session_id: sessionId });
    },
    firstTrade: (tradeData: any) => {
      track('funnel_first_trade_executed', {
        asset_name: tradeData.asset_name,
        trade_type: tradeData.trade_type,
      });
    },
  };

  // Enhanced education event tracking with engagement funnels
  const trackEducation = {
    videoStart: (videoId: string, title: string) => {
      track('education_video_started', { 
        video_id: videoId, 
        video_title: title,
        timestamp: new Date().toISOString(),
      });
      track('funnel_education_video_started', { 
        video_id: videoId, 
        video_title: title,
        is_first_video: false, // You can track this based on user history
      });
    },
    videoProgress: (videoId: string, title: string, percentage: number) => {
      track('education_video_progress', { 
        video_id: videoId, 
        video_title: title,
        progress_percentage: percentage,
      });
      
      // Track key milestones
      if (percentage === 25) {
        track('funnel_video_25_percent', { video_id: videoId });
      } else if (percentage === 50) {
        track('funnel_video_50_percent', { video_id: videoId });
      } else if (percentage === 75) {
        track('funnel_video_75_percent', { video_id: videoId });
      }
    },
    videoComplete: (videoId: string, title: string) => {
      track('education_video_completed', { 
        video_id: videoId, 
        video_title: title,
        timestamp: new Date().toISOString(),
      });
      track('funnel_education_video_completed', { 
        video_id: videoId, 
        video_title: title,
      });
    },
    quizAttempt: (quizId: string, score: number) => {
      track('quiz_attempted', { 
        quiz_id: quizId, 
        score: score 
      });
      track('funnel_quiz_attempted', { 
        quiz_id: quizId, 
        score: score,
        passed: score >= 70,
      });
    },
    courseComplete: (courseId: string) => {
      track('funnel_course_completed', { course_id: courseId });
    },
  };

  // Enhanced tools tracking
  const trackTools = {
    calculatorUse: (calculatorType: string) => {
      track('calculator_used', { 
        calculator_type: calculatorType,
        timestamp: new Date().toISOString(),
      });
      track('funnel_advanced_tool_used', { tool_type: calculatorType });
    },
    economicCalendarView: () => {
      track('economic_calendar_viewed');
      track('funnel_advanced_tool_used', { tool_type: 'economic_calendar' });
    },
    tradingJournalEntry: () => {
      track('trading_journal_entry_created');
      track('funnel_advanced_tool_used', { tool_type: 'trading_journal' });
    },
  };

  // Feature flag helpers using the context
  const featureFlags = {
    // UI/UX Feature Flags
    isNewDashboardEnabled: () => getFeatureFlag('new_dashboard_ui'),
    isEnhancedOnboardingEnabled: () => getFeatureFlag('enhanced_onboarding'),
    isNewSignalUIEnabled: () => getFeatureFlag('new_signal_ui'),
    isAdvancedChartsEnabled: () => getFeatureFlag('advanced_charts'),
    
    // Admin Feature Flags
    isAdvancedAdminPanelEnabled: () => getFeatureFlag('advanced_admin_panel'),
    isBulkUserActionsEnabled: () => getFeatureFlag('bulk_user_actions'),
    
    // Education Feature Flags
    isInteractiveQuizzesEnabled: () => getFeatureFlag('interactive_quizzes'),
    isProgressTrackingEnabled: () => getFeatureFlag('progress_tracking'),
    
    // Trading Feature Flags
    isAdvancedSignalsEnabled: () => getFeatureFlag('advanced_signals'),
    isRealTimePricesEnabled: () => getFeatureFlag('real_time_prices'),
    
    // Experimental Features
    isAIAssistantEnabled: () => getFeatureFlag('ai_assistant'),
    isSocialTradingEnabled: () => getFeatureFlag('social_trading'),
  };

  // Feature flag tracking
  const trackFeatureFlag = (flagName: string, flagValue: boolean | string, context?: any) => {
    track('feature_flag_evaluated', {
      flag_name: flagName,
      flag_value: flagValue,
      user_type: profile?.user_type,
      ...context,
    });
  };

  return {
    track,
    trackAuth,
    trackTrading,
    trackEducation,
    trackTools,
    featureFlags,
    trackFeatureFlag,
    isEnabled,
    onFeatureFlags,
  };
}
