import React, { useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { MeccaXXDashboard, MeccaXXDashboardRef } from './mecca';

export interface GeminiSetupAnalyzerRef {
  showApiKeySetup: () => void;
  isApiKeySet: boolean;
  checkApiKeyStatus: () => boolean;
  openProAnalysis: (analysis: any) => void;
}

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
  /** Swipe handlers from JournalXX - for consistent swipe behavior */
  touchStartY?: React.MutableRefObject<number | null>;
  touchStartX?: React.MutableRefObject<number | null>;
  wheelCooldown?: React.MutableRefObject<boolean>;
  minSwipeDistance?: number;
  handleSwipeEnd?: (startY: number, startX: number, endY: number, endX: number, target: HTMLElement) => void;
  activeTab?: string;
}

export const GeminiSetupAnalyzer = forwardRef<GeminiSetupAnalyzerRef, GeminiSetupAnalyzerProps>(({ 
  className = '',
  isDarkMode = true,
  mobileActiveTab,
  onMobileTabChange,
  isMobileInstance = false,
  hideAiPanel = false,
  insightOnly = false,
  touchStartY,
  touchStartX,
  wheelCooldown,
  minSwipeDistance,
  handleSwipeEnd,
  activeTab,
}, ref) => {
  const meccaRef = React.useRef<MeccaXXDashboardRef>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState(false);

  // Track API key status from MeccaXXDashboard and update local state
  useEffect(() => {
    const checkStatus = () => {
      const currentStatus = meccaRef.current?.isApiKeySet ?? false;
      setApiKeyStatus(prev => {
        if (prev !== currentStatus) {
          console.log('[GeminiSetupAnalyzer] API key status changed:', prev, '->', currentStatus);
        }
        return currentStatus;
      });
    };
    
    // Check immediately
    checkStatus();
    
    // Poll for changes (especially after API key is set)
    const interval = setInterval(checkStatus, 100);
    
    return () => clearInterval(interval);
  }, []);

  useImperativeHandle(ref, () => ({
    showApiKeySetup: () => {
      console.log('[GeminiSetupAnalyzer] showApiKeySetup called, meccaRef.current:', meccaRef.current);
      meccaRef.current?.showApiKeySetup();
    },
    get isApiKeySet() {
      const status = meccaRef.current?.isApiKeySet ?? apiKeyStatus;
      return status;
    },
    checkApiKeyStatus: () => {
      const status = meccaRef.current?.isApiKeySet ?? apiKeyStatus;
      return status;
    },
    openProAnalysis: (analysis: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GeminiSetupAnalyzer.tsx:83',message:'openProAnalysis called',data:{hasAnalysis:!!analysis,hasMeccaRef:!!meccaRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[GeminiSetupAnalyzer] openProAnalysis called with analysis:', analysis);
      console.log('[GeminiSetupAnalyzer] meccaRef.current:', meccaRef.current);
      if (meccaRef.current) {
        try {
          meccaRef.current.openProAnalysis(analysis);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GeminiSetupAnalyzer.tsx:88',message:'Forwarded to MeccaXXDashboard',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.log('[GeminiSetupAnalyzer] openProAnalysis forwarded to MeccaXXDashboard');
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GeminiSetupAnalyzer.tsx:91',message:'Error forwarding',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          console.error('[GeminiSetupAnalyzer] Error forwarding openProAnalysis:', error);
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GeminiSetupAnalyzer.tsx:94',message:'meccaRef is null - REF CHAIN BROKEN',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error('[GeminiSetupAnalyzer] meccaRef.current is null!');
      }
    },
  }), [apiKeyStatus]);

  return (
    <div className={`w-full h-full min-h-0 flex flex-col ${className}`}>
      <MeccaXXDashboard 
        ref={meccaRef}
        isDarkMode={isDarkMode}
        mobileActiveTab={mobileActiveTab}
        onMobileTabChange={onMobileTabChange}
        isMobileInstance={isMobileInstance}
        hideAiPanel={hideAiPanel}
        insightOnly={insightOnly}
        touchStartY={touchStartY}
        touchStartX={touchStartX}
        wheelCooldown={wheelCooldown}
        minSwipeDistance={minSwipeDistance}
        handleSwipeEnd={handleSwipeEnd}
        activeTab={activeTab}
      />
    </div>
  );
});

GeminiSetupAnalyzer.displayName = 'GeminiSetupAnalyzer';

export default GeminiSetupAnalyzer;
