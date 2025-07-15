
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePostHog } from '@/contexts/PostHogContext';
import { useAuth } from '@/contexts/AuthContext';

export function usePostHogTracking() {
  const { track, identify, reset, isEnabled } = usePostHog();
  const { user, profile } = useAuth();
  const location = useLocation();

  // Track page views
  useEffect(() => {
    if (!isEnabled) return;
    
    track('$pageview', {
      $current_url: window.location.href,
      path: location.pathname,
    });
  }, [location.pathname, track, isEnabled]);

  // Handle user identification
  useEffect(() => {
    if (!isEnabled) return;

    if (user && profile) {
      identify(user.id, {
        email: user.email,
        display_name: profile.display_name,
        user_type: profile.user_type,
        access_level: profile.access_level,
        account_status: profile.account_status,
        registration_source: profile.registration_source,
        created_at: profile.created_at,
      });
    } else {
      reset();
    }
  }, [user, profile, identify, reset, isEnabled]);

  // Authentication event tracking
  const trackAuth = {
    login: (method: string = 'email') => {
      track('user_login', { method });
    },
    logout: () => {
      track('user_logout');
    },
    signup: (method: string = 'email') => {
      track('user_signup', { method });
    },
    accountRequest: (accountType: string) => {
      track('account_request_submitted', { account_type: accountType });
    },
  };

  // Trading event tracking
  const trackTrading = {
    signalCreate: (signalData: any) => {
      track('trade_signal_created', {
        asset_name: signalData.asset_name,
        trade_type: signalData.trade_type,
        entry_price: signalData.entry_price,
      });
    },
    signalView: (signalId: string) => {
      track('trade_signal_viewed', { signal_id: signalId });
    },
    signalShare: (signalId: string) => {
      track('trade_signal_shared', { signal_id: signalId });
    },
    liveSessionJoin: (sessionId: string) => {
      track('live_session_joined', { session_id: sessionId });
    },
  };

  // Education event tracking
  const trackEducation = {
    videoStart: (videoId: string, title: string) => {
      track('education_video_started', { 
        video_id: videoId, 
        video_title: title 
      });
    },
    videoComplete: (videoId: string, title: string) => {
      track('education_video_completed', { 
        video_id: videoId, 
        video_title: title 
      });
    },
    quizAttempt: (quizId: string, score: number) => {
      track('quiz_attempted', { 
        quiz_id: quizId, 
        score: score 
      });
    },
  };

  // Advanced tools tracking
  const trackTools = {
    calculatorUse: (calculatorType: string) => {
      track('calculator_used', { calculator_type: calculatorType });
    },
    economicCalendarView: () => {
      track('economic_calendar_viewed');
    },
    tradingJournalEntry: () => {
      track('trading_journal_entry_created');
    },
  };

  return {
    track,
    trackAuth,
    trackTrading,
    trackEducation,
    trackTools,
    isEnabled,
  };
}
