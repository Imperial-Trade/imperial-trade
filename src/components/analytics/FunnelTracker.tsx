
import React, { useEffect } from 'react';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import { useAuth } from '@/contexts/AuthContext';

interface FunnelTrackerProps {
  funnelName: string;
  step: string;
  stepData?: Record<string, any>;
  children?: React.ReactNode;
}

export const FunnelTracker: React.FC<FunnelTrackerProps> = ({
  funnelName,
  step,
  stepData = {},
  children
}) => {
  const { track } = usePostHogTracking();
  const { user, profile } = useAuth();

  useEffect(() => {
    // Track funnel step
    track(`funnel_${funnelName}_${step}`, {
      funnel_name: funnelName,
      step_name: step,
      user_id: user?.id,
      user_type: profile?.user_type,
      access_level: profile?.access_level,
      timestamp: new Date().toISOString(),
      ...stepData,
    });
  }, [funnelName, step, stepData, track, user?.id, profile?.user_type, profile?.access_level]);

  return <>{children}</>;
};

// Predefined funnel components for common use cases
export const AccountRequestFunnel: React.FC<{
  step: 'page_visit' | 'form_start' | 'form_submit' | 'approval' | 'first_login';
  stepData?: Record<string, any>;
  children?: React.ReactNode;
}> = ({ step, stepData, children }) => (
  <FunnelTracker funnelName="account_request" step={step} stepData={stepData}>
    {children}
  </FunnelTracker>
);

export const EducationFunnel: React.FC<{
  step: 'page_visit' | 'video_start' | 'video_25' | 'video_50' | 'video_75' | 'video_complete' | 'quiz_attempt' | 'course_complete';
  stepData?: Record<string, any>;
  children?: React.ReactNode;
}> = ({ step, stepData, children }) => (
  <FunnelTracker funnelName="education_engagement" step={step} stepData={stepData}>
    {children}
  </FunnelTracker>
);

export const SignalFunnel: React.FC<{
  step: 'page_visit' | 'signal_view' | 'signal_follow' | 'live_session_join' | 'trade_execute';
  stepData?: Record<string, any>;
  children?: React.ReactNode;
}> = ({ step, stepData, children }) => (
  <FunnelTracker funnelName="signal_engagement" step={step} stepData={stepData}>
    {children}
  </FunnelTracker>
);

export const EducatorFunnel: React.FC<{
  step: 'member_start' | 'educator_request' | 'first_signal' | 'signal_engagement' | 'live_session_host';
  stepData?: Record<string, any>;
  children?: React.ReactNode;
}> = ({ step, stepData, children }) => (
  <FunnelTracker funnelName="educator_pipeline" step={step} stepData={stepData}>
    {children}
  </FunnelTracker>
);
