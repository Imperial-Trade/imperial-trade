import React, { forwardRef } from 'react';
import { MeccaXXDashboard } from './mecca';
import type { MeccaXXDashboardRef } from './mecca/MeccaXXDashboard';

export type GeminiSetupAnalyzerRef = MeccaXXDashboardRef;

interface GeminiSetupAnalyzerProps {
  className?: string;
  isDarkMode?: boolean;
  mobileActiveTab?: 'chart' | 'economic' | 'analyze';
  onMobileTabChange?: (tab: 'chart' | 'economic' | 'analyze') => void;
  /** When true, this instance is the mobile one (lg:hidden). Only this instance portals into #mecca-mobile-asset-slot to avoid duplicates. */
  isMobileInstance?: boolean;
  /** When true, MECCA shows only Chart + Economic Calendar (no AI slide/panel). AI moves to Insight tab. */
  hideAiPanel?: boolean;
  /** When true, render only the Gemini API setup / AI analysis panel (for Insight tab). */
  insightOnly?: boolean;
}

/**
 * Forwards ref to MeccaXXDashboard so the Key button can open the API key modal
 * (showApiKeySetup) and history can open analysis (openProAnalysis) from Journal XX.
 */
export const GeminiSetupAnalyzer = forwardRef<MeccaXXDashboardRef, GeminiSetupAnalyzerProps>(
  (
    {
      className = '',
      isDarkMode = true,
      mobileActiveTab,
      onMobileTabChange,
      isMobileInstance = false,
      hideAiPanel = false,
      insightOnly = false,
    },
    ref
  ) => (
    <div className={`w-full h-full min-h-0 flex flex-col ${className}`}>
      <MeccaXXDashboard
        ref={ref}
        isDarkMode={isDarkMode}
        mobileActiveTab={mobileActiveTab}
        onMobileTabChange={onMobileTabChange}
        isMobileInstance={isMobileInstance}
        hideAiPanel={hideAiPanel}
        insightOnly={insightOnly}
      />
    </div>
  )
);

GeminiSetupAnalyzer.displayName = 'GeminiSetupAnalyzer';

export default GeminiSetupAnalyzer;
