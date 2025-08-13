import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { adaptiveRateLimitService } from "@/services/AdaptiveRateLimitService";
import { serverRateLimitService } from "@/services/ServerRateLimitService";

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
  const location = useLocation();
  const isAccountRequestPage = location.pathname === "/account-request";

  const [state, setState] = useState<AdaptiveRateLimitState>({
    canSubmit: true,
    attemptsLeft: 5,
    nextAttemptDelay: 0,
    adaptedLimits: null,
    trustScore: 50,
    riskCategory: "normal",
    requiresCaptcha: false,
    additionalVerification: false,
    threatLevel: "low",
    systemLoad: null,
    isAdapting: false,
  });

  const calculateAdaptiveLimits = useCallback(async () => {
    // Early return if not on account request page
    if (!isAccountRequestPage || !config.identifier || !config.email) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, isAdapting: true }));

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
      const userProfile = adaptiveRateLimitService.getUserProfile(
        config.identifier
      );

      // Check server-side limits
      const emailCheck = await serverRateLimitService.checkEmailRateLimit(
        config.email
      );
      const ipCheck = await serverRateLimitService.checkIPRateLimit(
        serverRateLimitService.getClientIP()
      );

      // Determine final state
      const canSubmit =
        emailCheck.allowed &&
        ipCheck.allowed &&
        (threatLevel.recommendedAction === "allow" ||
          threatLevel.recommendedAction === "throttle");

      setState({
        canSubmit,
        attemptsLeft: Math.min(
          emailCheck.attemptsRemaining,
          ipCheck.attemptsRemaining,
          adaptedLimits.maxAttempts
        ),
        nextAttemptDelay: Math.max(
          0,
          Math.min(
            new Date(emailCheck.resetTime).getTime() - Date.now(),
            new Date(ipCheck.resetTime).getTime() - Date.now()
          )
        ),
        adaptedLimits,
        trustScore: userProfile?.trustScore || 50,
        riskCategory:
          adaptedLimits.maxAttempts <= 2
            ? "risky"
            : adaptedLimits.maxAttempts <= 5
            ? "normal"
            : "trusted",
        requiresCaptcha:
          adaptedLimits.requiresCaptcha || threatLevel.current === "high",
        additionalVerification:
          adaptedLimits.additionalVerification ||
          threatLevel.current === "critical",
        threatLevel: threatLevel.current,
        systemLoad,
        isAdapting: false,
      });

      logger.log("🎯 Adaptive rate limit state updated:", {
        canSubmit,
        trustScore: userProfile?.trustScore,
        threatLevel: threatLevel.current,
        adaptedLimits,
      });
    } catch (error) {
      logger.error("❌ Failed to calculate adaptive limits:", error);
      setState((prev) => ({ ...prev, isAdapting: false }));
    }
  }, [
    config.identifier,
    config.email,
    config.securityAnalysis,
    config.behavioralAnalysis,
    isAccountRequestPage,
  ]);

  const recordSubmissionResult = useCallback(
    async (success: boolean) => {
      if (!isAccountRequestPage) return;

      await adaptiveRateLimitService.updateSubmissionResult(
        config.identifier,
        success
      );
      // Only recalculate if on correct page
      if (isAccountRequestPage) {
        setTimeout(calculateAdaptiveLimits, 1000);
      }
    },
    [config.identifier, calculateAdaptiveLimits, isAccountRequestPage]
  );

  const getStatusMessage = useCallback((): string => {
    if (!isAccountRequestPage) {
      return "Not available on this page";
    }

    if (state.isAdapting) {
      return "Analyzing security profile...";
    }

    if (!state.canSubmit) {
      if (state.threatLevel === "critical") {
        return "System security alert - submissions temporarily restricted";
      }
      if (state.nextAttemptDelay > 0) {
        const minutes = Math.ceil(state.nextAttemptDelay / (1000 * 60));
        return `Rate limited - try again in ${minutes} minute${
          minutes !== 1 ? "s" : ""
        }`;
      }
      return "Submission blocked due to security concerns";
    }

    return `${state.attemptsLeft} attempt${
      state.attemptsLeft !== 1 ? "s" : ""
    } remaining`;
  }, [state, isAccountRequestPage]);

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
        state.trustScore < 40
          ? "Complete verification to improve trust score"
          : null,
        state.requiresCaptcha ? "CAPTCHA verification may be required" : null,
        state.threatLevel === "high"
          ? "Enhanced security measures active"
          : null,
      ].filter(Boolean),
    };
  }, [state]);

  // Initialize only on account request page
  useEffect(() => {
    if (isAccountRequestPage) {
      calculateAdaptiveLimits();
    }
  }, [calculateAdaptiveLimits, isAccountRequestPage]);

  // Remove periodic updates - only update on page mount and submission
  // No more 30-second intervals!

  return {
    ...state,
    recordSubmissionResult,
    getStatusMessage,
    getSecurityInsights: getStatusMessage, // Simplified
    refresh: calculateAdaptiveLimits,
  };
};
