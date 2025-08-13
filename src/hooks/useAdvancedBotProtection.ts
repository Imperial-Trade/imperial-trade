import { useState, useCallback } from "react";
import { useBehavioralAnalysis } from "./useBehavioralAnalysis";
import { detectSuspiciousPatterns } from "@/lib/validations/enhancedSecurityRules";

interface BotProtectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
  requiresCaptcha: boolean;
}

export const useAdvancedBotProtection = () => {
  const [protectionResult, setProtectionResult] =
    useState<BotProtectionResult | null>(null);
  const { analyzeeBehavior, handleFieldFocus } = useBehavioralAnalysis();

  const analyzeSubmission = useCallback(
    async (formData: any): Promise<BotProtectionResult> => {
      logger.log("🛡️ Running advanced bot protection analysis...");

      // Get behavioral analysis
      const behavioralResult = analyzeeBehavior();

      // Get pattern analysis
      const patternResult = detectSuspiciousPatterns(formData);

      // Combine scores and reasons
      const totalScore = behavioralResult.suspiciousScore + patternResult.score;
      const allReasons = [
        ...behavioralResult.reasons,
        ...patternResult.reasons,
      ];

      // Determine confidence and bot likelihood
      const confidence = Math.min(totalScore / 100, 1); // Normalize to 0-1
      const isBot = totalScore >= 60; // Threshold for bot detection
      const requiresCaptcha = totalScore >= 40 && totalScore < 60; // Suspicious but not definitive

      const result: BotProtectionResult = {
        isBot,
        confidence,
        reasons: allReasons,
        requiresCaptcha,
      };

      logger.log("🛡️ Bot protection result:", result);
      setProtectionResult(result);

      // Log detailed analysis for monitoring
      logger.log("📊 Detailed Analysis:", {
        behavioral: behavioralResult,
        patterns: patternResult,
        totalScore,
        threshold: 60,
      });

      return result;
    },
    [analyzeeBehavior]
  );

  const resetProtection = useCallback(() => {
    setProtectionResult(null);
  }, []);

  return {
    protectionResult,
    analyzeSubmission,
    resetProtection,
    handleFieldFocus,
  };
};
