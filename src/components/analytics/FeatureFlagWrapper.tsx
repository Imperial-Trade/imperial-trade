
import React from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface FeatureFlagWrapperProps {
  flagName: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureFlagWrapper: React.FC<FeatureFlagWrapperProps> = ({
  flagName,
  fallback = null,
  children
}) => {
  const { getFlag } = useFeatureFlags();
  
  const isEnabled = getFlag(flagName);
  
  return <>{isEnabled ? children : fallback}</>;
};

// Predefined feature flag components for common use cases
export const NewDashboardWrapper: React.FC<{
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ fallback, children }) => (
  <FeatureFlagWrapper flagName="new_dashboard_ui" fallback={fallback}>
    {children}
  </FeatureFlagWrapper>
);

export const EnhancedOnboardingWrapper: React.FC<{
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ fallback, children }) => (
  <FeatureFlagWrapper flagName="enhanced_onboarding" fallback={fallback}>
    {children}
  </FeatureFlagWrapper>
);

export const AdvancedSignalsWrapper: React.FC<{
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ fallback, children }) => (
  <FeatureFlagWrapper flagName="advanced_signals" fallback={fallback}>
    {children}
  </FeatureFlagWrapper>
);

export const AIAssistantWrapper: React.FC<{
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ fallback, children }) => (
  <FeatureFlagWrapper flagName="ai_assistant" fallback={fallback}>
    {children}
  </FeatureFlagWrapper>
);
