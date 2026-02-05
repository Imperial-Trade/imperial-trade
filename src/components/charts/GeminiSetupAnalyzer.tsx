import React from 'react';
import { MeccaXXDashboard } from './mecca';

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

export const GeminiSetupAnalyzer: React.FC<GeminiSetupAnalyzerProps> = ({ 
  className = '',
  isDarkMode = true,
  mobileActiveTab,
  onMobileTabChange,
  isMobileInstance = false,
  hideAiPanel = false,
  insightOnly = false,
}) => {
  return (
    <div className={`w-full h-full min-h-0 flex flex-col ${className}`}>
      <MeccaXXDashboard 
        isDarkMode={isDarkMode}
        mobileActiveTab={mobileActiveTab}
        onMobileTabChange={onMobileTabChange}
        isMobileInstance={isMobileInstance}
        hideAiPanel={hideAiPanel}
        insightOnly={insightOnly}
      />
    </div>
  );
};

export default GeminiSetupAnalyzer;
