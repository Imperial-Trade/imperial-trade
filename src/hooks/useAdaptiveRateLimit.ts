
import { useState, useEffect, useCallback } from 'react';
import { adaptiveRateLimitService } from '@/services/AdaptiveRateLimitService';
import { serverRateLimitService } from '@/services/ServerRateLimitService';

interface AdaptiveRateLimitConfig {
  identifier: string;
  email: string;
  securityAnalysis?: any;
  behavioralAnalysis?: any;
}

interface AdaptiveRateLimitState {
  canSubmit: boolean;
  attemptsLeft: number;
  nextAttemptDelay: number;
  adaptedLimits: any;
  trustScore: number;
  riskCategory: string;
  requiresCaptcha: boolean;
  additionalVerification: boolean;
  threatLevel: string;
  systemLoad: any;
  isAdapting: boolean;
}

export const useAdaptiveRateLimit = (config: AdaptiveRateLimitConfig) => {
  const [state, setState] = useState<AdaptiveRateLimitState>({
    canSubmit: true,
    attemptsLeft: 5,
    nextAttemptDelay: 0,
    adaptedLimits: null,
    trustScore: 50,
    riskCategory: 'normal',
    requiresCaptcha: false,
    additionalVerification: false,
    threatLevel: 'low',
    systemLoad: null,
    isAdapting: false,
  });

  const calculateAdaptiveLimits = useCallback(async () => {
    if (!config.identifier || !config.email) return;

    try {
      setState(prev => ({ ...prev, isAdapting: true }));

      // Get adaptive rate limits
      const adaptedLimits = await adaptiveRateLimitService.getAdaptiveRateLimit(
        config.identifier,
        config.email,
        config.securityAnalysis,
        config.behavioralAnalysis
      );

      // Get current system status
      const threatLevel = adaptiveRateLimitService.getCurrentThreatLevel();
      const systemLoad = adaptiveRateLimitService.getSystemLoad();
      const userProfile = adaptiveRateLimitService.getUserProfile(config.identifier);

      // Check server-side limits
      const emailCheck = await serverRateLimitService.checkEmailRateLimit(config.email);
      const ipCheck = await serverRateLimitService.checkIPRateLimit(
        serverRateLimitService.getClientIP()
      );

      // Determine final state
      const canSubmit = emailCheck.allowed && ipCheck.allowed && 
                       (threatLevel.recommendedAction === 'allow' || 
                        threatLevel.recommendedAction === 'throttle');

      setState({
        canSubmit,
        attemptsLeft: Math.min(emailCheck.attemptsRemaining, ipCheck.attemptsRemaining, adaptedLimits.maxAttempts),
        nextAttemptDelay: Math.max(0, Math.min(
          new Date(emailCheck.resetTime).getTime() - Date.now(),
          new Date(ipCheck.resetTime).getTime() - Date.now()
        )),
        adaptedLimits,
        trustScore: userProfile?.trustScore || 50,
        riskCategory: adaptedLimits.maxAttempts <= 2 ? 'risky' : 
                     adaptedLimits.maxAttempts <= 5 ? 'normal' : 'trusted',
        requiresCaptcha: adaptedLimits.requiresCaptcha || threatLevel.current === 'high',
        additionalVerification: adaptedLimits.additionalVerification || threatLevel.current === 'critical',
        threatLevel: threatLevel.current,
        systemLoad,
        isAdapting: false,
      });

      console.log('🎯 Adaptive rate limit state updated:', {
        canSubmit,
        trustScore: userProfile?.trustScore,
        threatLevel: threatLevel.current,
        adaptedLimits,
      });

    } catch (error) {
      console.error('❌ Failed to calculate adaptive limits:', error);
      setState(prev => ({ ...prev, isAdapting: false }));
    }
  }, [config.identifier, config.email, config.securityAnalysis, config.behavioralAnalysis]);

  const recordSubmissionResult = useCallback(async (success: boolean) => {
    await adaptiveRateLimitService.updateSubmissionResult(config.identifier, success);
    // Recalculate limits after submission
    setTimeout(calculateAdaptiveLimits, 1000);
  }, [config.identifier, calculateAdaptiveLimits]);

  const getStatusMessage = useCallback((): string => {
    if (state.isAdapting) {
      return 'Analyzing security profile...';
    }

    if (!state.canSubmit) {
      if (state.threatLevel === 'critical') {
        return 'System security alert - submissions temporarily restricted';
      }
      if (state.nextAttemptDelay > 0) {
        const minutes = Math.ceil(state.nextAttemptDelay / (1000 * 60));
        return `Rate limited - try again in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return 'Submission blocked due to security concerns';
    }

    if (state.requiresCaptcha) {
      return 'Additional verification required';
    }

    if (state.riskCategory === 'trusted') {
      return `Trusted user - ${state.attemptsLeft} attempts remaining`;
    }

    if (state.riskCategory === 'risky') {
      return `High security mode - ${state.attemptsLeft} attempt${state.attemptsLeft !== 1 ? 's' : ''} remaining`;
    }

    return `${state.attemptsLeft} attempt${state.attemptsLeft !== 1 ? 's' : ''} remaining`;
  }, [state]);

  const getSecurityInsights = useCallback(() => {
    return {
      trustScore: state.trustScore,
      riskCategory: state.riskCategory,
      threatLevel: state.threatLevel,
      adaptiveFeatures: {
        dynamicLimits: true,
        behavioralAnalysis: true,
        systemLoadAdjustment: true,
        threatIntelligence: true,
      },
      recommendations: [
        state.trustScore < 40 ? 'Complete verification to improve trust score' : null,
        state.requiresCaptcha ? 'CAPTCHA verification may be required' : null,
        state.threatLevel === 'high' ? 'Enhanced security measures active' : null,
      ].filter(Boolean),
    };
  }, [state]);

  // Initialize and update on config changes
  useEffect(() => {
    calculateAdaptiveLimits();
  }, [calculateAdaptiveLimits]);

  // Periodic updates for system status
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isAdapting) {
        calculateAdaptiveLimits();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [calculateAdaptiveLimits, state.isAdapting]);

  return {
    ...state,
    recordSubmissionResult,
    getStatusMessage,
    getSecurityInsights,
    refresh: calculateAdaptiveLimits,
  };
};
