import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Key, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, X, Sparkles } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import { TradingViewWidget } from '../TradingViewWidget';
import MarketTickerBar from './MarketTickerBar';
import NewsCalendar from './NewsCalendar';
import AIAnalysisPanel from './AIAnalysisPanel';
import SessionTimeline from './SessionTimeline';
import TimeframeSelector from './TimeframeSelector';
import ProAnalysisModal from './ProAnalysisModal';
import { MeccaSpotlightCard } from './MeccaSpotlightCard';
import { neonColors, neonAnimations, sessionColors } from './neonTheme';
import NewsTicker from '@/components/shared/NewsTicker';
import { ProAnalysisResult, toBasicAnalysis } from './proAnalysisTypes';
import { analyzeWithGemini } from './proAnalysisService';

// Premium accent colors matching JournalXX
const premiumColors = {
  emerald: '#22c55e',
  emeraldLight: '#4ade80',
  emeraldDark: '#16a34a',
  emeraldGlow: 'rgba(34, 197, 94, 0.4)',
  emeraldSubtle: 'rgba(34, 197, 94, 0.1)',
  emeraldBorder: 'rgba(34, 197, 94, 0.15)',
  gold: '#eab308',
  goldLight: '#facc15',
};

// Alias for backwards compatibility
const greenAccent = {
  primary: premiumColors.emerald,
  light: premiumColors.emeraldLight,
  dark: premiumColors.emeraldDark,
  glow: premiumColors.emeraldGlow,
  subtle: premiumColors.emeraldSubtle,
  border: premiumColors.emeraldBorder,
};

// Session data for inline indicators
const SESSIONS = [
  { id: 'sydney', shortName: 'SYD', startHour: 21, endHour: 6, color: sessionColors.sydney },
  { id: 'tokyo', shortName: 'TKY', startHour: 23, endHour: 8, color: sessionColors.tokyo },
  { id: 'london', shortName: 'LDN', startHour: 7, endHour: 16, color: sessionColors.london },
  { id: 'newyork', shortName: 'NYC', startHour: 12, endHour: 21, color: sessionColors.newYork },
];

// Compact session indicators for the top header bar
const SessionIndicators: React.FC<{ slim?: boolean }> = ({ slim = false }) => {
  const [activeSessions, setActiveSessions] = useState<string[]>([]);

  useEffect(() => {
    const updateSessions = () => {
      const hour = new Date().getUTCHours();
      const active = SESSIONS.filter((session) => {
        if (session.startHour < session.endHour) {
          return hour >= session.startHour && hour < session.endHour;
        } else {
          return hour >= session.startHour || hour < session.endHour;
        }
      }).map((s) => s.id);
      setActiveSessions(active);
    };

    updateSessions();
    const interval = setInterval(updateSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center ${slim ? 'gap-0.5' : 'gap-1.5'}`}>
      {SESSIONS.map((session) => {
        const active = activeSessions.includes(session.id);
        return (
          <div
            key={session.id}
            className={`flex items-center rounded-full transition-all duration-300 ${slim ? 'gap-0.5 px-1 py-0.5' : 'gap-1 px-2 py-1'}`}
            style={{
              background: active ? `${session.color.bg}20` : 'transparent',
            }}
          >
            <div
              className={`rounded-full ${active ? 'animate-pulse' : ''} ${slim ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
              style={{ background: active ? session.color.bg : neonColors.textDim }}
            />
            <span
              className={`font-medium ${slim ? 'text-[8px]' : 'text-[10px]'}`}
              style={{ color: active ? session.color.bg : neonColors.textDim }}
            >
              {session.shortName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Premium glassmorphism card with subtle aurora effect
const GlassCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  enableGlow?: boolean;
}> = ({ children, className = '', enableGlow = false }) => (
  <div
    className={`relative rounded-3xl overflow-hidden group transition-all duration-300 ${className}`}
    style={{
      background: 'rgba(10, 10, 10, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: enableGlow 
        ? `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px ${premiumColors.emeraldSubtle}`
        : '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}
  >
    {/* Subtle top border highlight */}
    <div 
      className="absolute top-0 left-0 right-0 h-px pointer-events-none"
      style={{
        background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)`,
      }}
    />
    {/* Content */}
    <div className="relative z-[2]">{children}</div>
  </div>
);

// Hook to detect screen size
const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return {
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    screenSize,
  };
};

interface AnalysisResult {
  insight: string;
  support: { price: number; label: string }[];
  resistance: { price: number; label: string }[];
  patterns: { type: string; description: string }[];
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// Trading strategy options with primary execution TF and higher TF for context
const TRADING_STYLES = [
  { 
    value: 'scalping', 
    label: 'Scalping', 
    description: '1-5 min trades, quick entries/exits', 
    timeframes: ['1m', '5m'],
    primaryTF: '1m',      // Execution timeframe
    contextTF: '15m',     // Higher timeframe for trend context
    candleCount: 100      // More candles for quick TFs
  },
  { 
    value: 'intraday', 
    label: 'Intraday', 
    description: '15min-1h trades, same day close', 
    timeframes: ['15m', '1h'],
    primaryTF: '15m',     // Execution timeframe  
    contextTF: '1h',      // Higher timeframe for trend context
    candleCount: 100
  },
  { 
    value: 'swing', 
    label: 'Swing Trade', 
    description: '4h-1D trades, multi-day holds', 
    timeframes: ['4h', '1d'],
    primaryTF: '4h',      // Execution timeframe
    contextTF: '1d',      // Higher timeframe for trend context
    candleCount: 100
  },
  { 
    value: 'position', 
    label: 'Position', 
    description: 'Weekly trades, long-term holds', 
    timeframes: ['1d', '1w'],
    primaryTF: '1d',      // Execution timeframe
    contextTF: '1w',      // Higher timeframe for trend context
    candleCount: 50       // Fewer candles needed for longer TFs
  },
] as const;

type TradingStyle = typeof TRADING_STYLES[number]['value'];

// Helper to get style config
const getStyleConfig = (style: TradingStyle) => {
  return TRADING_STYLES.find(s => s.value === style) || TRADING_STYLES[1]; // Default to intraday
};

// 5 assets for Insight: display label + internal symbol for API/live prices
const INSIGHT_ASSETS = [
  { display: 'XAUUSD', internal: 'XAUUSD' },
  { display: 'BTCUSD', internal: 'BTCUSD' },
  { display: 'US30', internal: 'U30USD' },
  { display: 'NAS100', internal: 'NDXUSD' },
  { display: 'SPX', internal: 'SPXUSD' },
] as const;

const getInsightDisplayName = (internal: string) =>
  INSIGHT_ASSETS.find((a) => a.internal === internal)?.display ?? internal;

// Selectable 5-asset cards for insightOnly: live price, green/red by movement, click to select with gradient+animation
interface InsightAssetCardsProps {
  selectedInternal: string;
  onSelect: (internal: string) => void;
}

const InsightAssetCards: React.FC<InsightAssetCardsProps> = ({ selectedInternal, onSelect }) => {
  const p1 = useOptimizedLivePrice('XAUUSD', { debounceMs: 100 });
  const p2 = useOptimizedLivePrice('BTCUSD', { debounceMs: 100 });
  const p3 = useOptimizedLivePrice('U30USD', { debounceMs: 100 });
  const p4 = useOptimizedLivePrice('NDXUSD', { debounceMs: 100 });
  const p5 = useOptimizedLivePrice('SPXUSD', { debounceMs: 100 });
  const prices = [p1, p2, p3, p4, p5];

  return (
    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 px-4 pt-4 pb-2">
      {INSIGHT_ASSETS.map(({ display, internal }, i) => {
        const { livePrice, change } = prices[i];
        const isUp = change > 0;
        const isDown = change < 0;
        const selected = selectedInternal === internal;
        return (
          <button
            key={internal}
            type="button"
            onClick={() => onSelect(internal)}
            className={`relative flex flex-col items-center justify-center py-3 px-2 sm:py-4 sm:px-3 rounded-2xl min-w-0 transition-all duration-300 ease-out active:scale-[0.98] ${
              selected ? 'scale-[1.02]' : 'scale-100'
            }`}
            style={{
              background: selected
                ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.18) 0%, rgba(4, 120, 87, 0.14) 50%, rgba(6, 95, 70, 0.12) 100%)'
                : 'rgba(255, 255, 255, 0.03)',
              border: selected ? '2px solid rgba(13, 148, 136, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: selected ? '0 0 20px rgba(13, 148, 136, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[11px] sm:text-xs font-bold tracking-wide truncate w-full text-center mb-1" style={{ color: selected ? 'rgba(167, 243, 208, 0.95)' : neonColors.textDim }}>
              {display}
            </span>
            <span
              className={`text-sm sm:text-base font-bold tabular-nums ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : ''}`}
              style={!isUp && !isDown ? { color: neonColors.textPrimary } : undefined}
            >
              {livePrice != null && livePrice > 0 ? livePrice.toFixed(2) : '—'}
            </span>
            {selected && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400" style={{ opacity: 0.8 }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

interface MeccaXXDashboardProps {
  isDarkMode?: boolean;
  mobileActiveTab?: 'chart' | 'economic' | 'analyze';
  onMobileTabChange?: (tab: 'chart' | 'economic' | 'analyze') => void;
  /** When true, this instance is the mobile one; only it should portal into #mecca-mobile-asset-slot. */
  isMobileInstance?: boolean;
  /** When true, MECCA shows only Chart + Economic Calendar (no AI slide/panel). AI is in Insight tab. */
  hideAiPanel?: boolean;
  /** When true, render only the Gemini API setup / AI analysis panel (for Insight tab). */
  insightOnly?: boolean;
}

const MeccaXXDashboard: React.FC<MeccaXXDashboardProps> = ({
  isDarkMode = true,
  mobileActiveTab: externalMobileTab,
  onMobileTabChange,
  isMobileInstance = false,
  hideAiPanel = false,
  insightOnly = false,
}) => {
  // State
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>('intraday');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [proAnalysis, setProAnalysis] = useState<ProAnalysisResult | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [internalMobileTab, setInternalMobileTab] = useState<'chart' | 'economic' | 'analyze'>('chart');
  
  // Use external tab if provided, otherwise use internal state
  const mobileActiveTab = externalMobileTab ?? internalMobileTab;
  const setMobileActiveTab = onMobileTabChange ?? setInternalMobileTab;

  // Mobile swipe state (Journal XX pattern: 3 slides, vertical)
  const [activeMeccaSlide, setActiveMeccaSlide] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const wheelCooldown = useRef(false);
  const swipeDisabledRef = useRef(false); // true when touch started in AI scroll area — skip slide change, allow scroll
  const minSwipe = 25;

  const maxMeccaSlide = hideAiPanel ? 1 : 2;
  const handleMeccaSwipeEnd = (startY: number, startX: number, endY: number, endX: number) => {
    const dy = endY - startY;
    if (dy > minSwipe && activeMeccaSlide < maxMeccaSlide) setActiveMeccaSlide((s) => s + 1);
    else if (dy < -minSwipe && activeMeccaSlide > 0) setActiveMeccaSlide((s) => s - 1);
  };
  const onMeccaTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]'));
  };
  const onMeccaTouchMove = () => {};
  const onMeccaTouchMoveStrip = (e: React.TouchEvent) => { e.preventDefault(); }; // lock gesture on right-edge strip
  const onMeccaTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null || touchStartX.current == null) return;
    if (swipeDisabledRef.current) { swipeDisabledRef.current = false; touchStartY.current = null; touchStartX.current = null; return; }
    handleMeccaSwipeEnd(touchStartY.current, touchStartX.current, e.changedTouches[0].clientY, e.changedTouches[0].clientX);
    touchStartY.current = null; touchStartX.current = null;
  };
  const onMeccaMouseDown = (e: React.MouseEvent) => { touchStartY.current = e.clientY; touchStartX.current = e.clientX; swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]')); };
  const onMeccaMouseUp = (e: React.MouseEvent) => {
    if (touchStartY.current == null || touchStartX.current == null) return;
    if (swipeDisabledRef.current) { swipeDisabledRef.current = false; touchStartY.current = null; touchStartX.current = null; return; }
    handleMeccaSwipeEnd(touchStartY.current, touchStartX.current, e.clientY, e.clientX);
    touchStartY.current = null; touchStartX.current = null;
  };
  const onMeccaMouseLeave = () => { touchStartY.current = null; touchStartX.current = null; };
  const onMeccaWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return;
    const dy = e.deltaY;
    if (Math.abs(dy) > 30) {
      if (dy > 0 && activeMeccaSlide < maxMeccaSlide) { setActiveMeccaSlide((s) => s + 1); wheelCooldown.current = true; setTimeout(() => { wheelCooldown.current = false; }, 400); }
      else if (dy < 0 && activeMeccaSlide > 0) { setActiveMeccaSlide((s) => s - 1); wheelCooldown.current = true; setTimeout(() => { wheelCooldown.current = false; }, 400); }
    }
  };

  // Responsive hook
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Live price hook
  const { livePrice, change } = useOptimizedLivePrice(symbol, { debounceMs: 100 });
  
  // OANDA candles hook
  const { fetchCandles: fetchMarketCandles, isLoading: isFetchingCandles } = useMarketCandles();

  // Calculate chart height based on screen size
  const getChartHeight = () => {
    if (isMobile) return 300;
    if (isTablet) return 400;
    return 500;
  };

  // API Key handlers - validates key with a test API call
  const handleSetApiKey = useCallback(async () => {
    if (apiKey.trim().length < 20) {
      setError('Please enter a valid Gemini API key');
      setApiKeyStatus('invalid');
      return;
    }

    setIsValidatingKey(true);
    setError(null);
    setApiKeyStatus('idle');

    try {
      // Test the API key with a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );

      if (response.ok) {
        setIsApiKeySet(true);
        setApiKeyStatus('valid');
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || 'Invalid API key';
        setError(errorMessage.includes('API key') ? 'Invalid API key' : errorMessage);
        setApiKeyStatus('invalid');
        setIsApiKeySet(false);
      }
    } catch (err) {
      setError('Failed to validate API key');
      setApiKeyStatus('invalid');
      setIsApiKeySet(false);
    } finally {
      setIsValidatingKey(false);
    }
  }, [apiKey]);

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    setIsApiKeySet(false);
    setApiKeyStatus('idle');
    setAnalysis(null);
    setError(null);
  }, []);

  // Pro Analysis handler - fetches market data and uses institutional-grade Gemini prompt
  const analyzeSetup = useCallback(async () => {
    console.log('[ProAnalysis] ========== ANALYZE BUTTON CLICKED ==========');
    console.log('[ProAnalysis] isApiKeySet:', isApiKeySet);
    console.log('[ProAnalysis] livePrice:', livePrice);
    console.log('[ProAnalysis] symbol:', symbol);
    console.log('[ProAnalysis] timeframe (chart):', timeframe);
    console.log('[ProAnalysis] tradingStyle:', tradingStyle);
    
    if (!isApiKeySet) {
      console.log('[ProAnalysis] ERROR: API key not set');
      setError('Please set your API key first');
      return;
    }

    const currentPriceValue = livePrice && livePrice > 0 ? livePrice : 0;
    console.log('[ProAnalysis] currentPriceValue:', currentPriceValue);

    if (!currentPriceValue || currentPriceValue <= 0) {
      console.log('[ProAnalysis] ERROR: No live price');
      setError('Waiting for live price data...');
      return;
    }

    // Get the correct timeframes based on trading style
    const styleConfig = getStyleConfig(tradingStyle);
    const executionTF = styleConfig.primaryTF;  // Primary timeframe for entries
    const contextTF = styleConfig.contextTF;    // Higher TF for trend context
    const candleCount = styleConfig.candleCount;

    console.log(`[ProAnalysis] Style Config - Execution TF: ${executionTF}, Context TF: ${contextTF}, Candles: ${candleCount}`);

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setProAnalysis(null);
    setShowProModal(true); // Open modal immediately to show loading state

    try {
      console.log(`[ProAnalysis] Starting analysis for ${symbol} | Style: ${tradingStyle}`);
      
      // Step 1: Fetch PRIMARY timeframe candles (for execution)
      console.log(`[ProAnalysis] Fetching PRIMARY TF (${executionTF}) candles...`);
      const primaryCandles = await fetchMarketCandles(symbol, executionTF, candleCount);
      
      console.log('[ProAnalysis] Primary TF candles returned:', primaryCandles?.length);
      
      if (!primaryCandles || primaryCandles.length === 0) {
        console.log('[ProAnalysis] ERROR: No primary candles returned');
        throw new Error('Failed to fetch market data. Please try again.');
      }
      
      // Step 2: Fetch CONTEXT timeframe candles (for trend direction)
      console.log(`[ProAnalysis] Fetching CONTEXT TF (${contextTF}) candles...`);
      const contextCandles = await fetchMarketCandles(symbol, contextTF, 50);
      
      console.log('[ProAnalysis] Context TF candles returned:', contextCandles?.length);
      
      // Combine data for comprehensive analysis
      console.log(`[ProAnalysis] Received ${primaryCandles.length} primary + ${contextCandles?.length || 0} context candles`);
      
      // Step 3: Run pro analysis with Gemini (pass both timeframes)
      console.log('[ProAnalysis] Running AI analysis with trading style:', tradingStyle);
      const proResult = await analyzeWithGemini(
        apiKey,
        primaryCandles,
        symbol,
        executionTF,  // Use the style's execution timeframe
        currentPriceValue,
        tradingStyle,
        contextCandles || []  // Pass context candles for higher TF analysis
      );
      
      console.log('[ProAnalysis] Analysis complete:', proResult.tradeSetup.direction, proResult.tradeSetup.convictionGrade);
      
      // Set pro analysis result
      setProAnalysis(proResult);
      
      // Also set basic analysis for the side panel (backward compatibility)
      const basicResult = toBasicAnalysis(proResult);
      setAnalysis(basicResult);
      
    } catch (err) {
      console.error('[ProAnalysis] Error:', err);
      setError((err as Error).message || 'Failed to analyze setup');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isApiKeySet, symbol, timeframe, tradingStyle, apiKey, livePrice, fetchMarketCandles]);

  // Shared AI panel body (Gemini setup, trading style, analyze, results) — used in MECCA slide 2 and Insight-only view
  const aiPanelScrollContent = (
    <>
      {!isApiKeySet && (
        <div className="p-4 rounded-xl" style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)` }}>
              <Key className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: neonColors.textPrimary }}>Setup Gemini API</h3>
              <p className="text-xs" style={{ color: neonColors.textDim }}>Required for AI analysis</p>
            </div>
          </div>
          <div className="relative mb-3">
            <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={(e) => { setApiKey(e.target.value); if (apiKeyStatus !== 'idle') { setApiKeyStatus('idle'); setError(null); } }} placeholder="Paste your API key..." className="w-full px-4 py-3 pr-12 rounded-xl text-sm" style={{ background: neonColors.bgSecondary, border: `1px solid ${apiKeyStatus === 'invalid' ? neonColors.negative : neonColors.borderDefault}`, color: neonColors.textPrimary }} />
            <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">{showApiKey ? <EyeOff className="w-4 h-4" style={{ color: neonColors.textMuted }} /> : <Eye className="w-4 h-4" style={{ color: neonColors.textMuted }} />}</button>
          </div>
          {apiKeyStatus === 'invalid' && error && <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.1)' }}><AlertCircle className="w-4 h-4" style={{ color: neonColors.negative }} /><span className="text-xs" style={{ color: neonColors.negative }}>{error}</span></div>}
          <button onClick={handleSetApiKey} disabled={isValidatingKey || !apiKey.trim()} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: isValidatingKey ? neonColors.bgSecondary : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`, color: isValidatingKey ? neonColors.textMuted : '#000', opacity: !apiKey.trim() ? 0.5 : 1 }}>
            {isValidatingKey ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Validating...</span></> : <><CheckCircle2 className="w-4 h-4" /><span>Set API Key</span></>}
          </button>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="block text-center text-xs mt-3 underline" style={{ color: greenAccent.primary }}>Get your free API key →</a>
        </div>
      )}
      {isApiKeySet && (
        <>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: `${greenAccent.primary}10`, border: `1px solid ${greenAccent.primary}30` }}>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" style={{ color: greenAccent.primary }} /><span className="text-xs font-medium" style={{ color: greenAccent.primary }}>API Key Set</span></div>
            <button onClick={handleClearApiKey} className="text-xs underline" style={{ color: neonColors.textMuted }}>Change</button>
          </div>
          <div className="p-4 rounded-xl" style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: neonColors.textPrimary }}>Select Trading Style</h4>
            <div className="grid grid-cols-2 gap-2">
              {TRADING_STYLES.map((style) => (
                <button key={style.value} onClick={() => { setTradingStyle(style.value); if (style.timeframes[0] && !style.timeframes.includes(timeframe)) setTimeframe(style.timeframes[0]); }} className="p-3 rounded-xl text-left transition-all" style={{ background: tradingStyle === style.value ? `${greenAccent.primary}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${tradingStyle === style.value ? `${greenAccent.primary}50` : 'transparent'}` }}>
                  <span className="text-xs font-bold block" style={{ color: tradingStyle === style.value ? greenAccent.primary : neonColors.textPrimary }}>{style.label}</span>
                  <span className="text-[10px] block mt-0.5" style={{ color: neonColors.textDim }}>{style.description}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={analyzeSetup} disabled={isAnalyzing || !livePrice} className="w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-3 transition-all" style={{ background: isAnalyzing ? neonColors.bgSecondary : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`, color: isAnalyzing ? neonColors.textMuted : '#000', opacity: !livePrice ? 0.5 : 1, boxShadow: isAnalyzing ? 'none' : `0 4px 20px ${greenAccent.primary}40` }}>
            {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Analyzing {getInsightDisplayName(symbol)}...</span></> : <><Brain className="w-5 h-5" /><span>Analyze {getInsightDisplayName(symbol)}</span></>}
          </button>
        </>
      )}
      {analysis && (
        <div className="p-4 rounded-xl" style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Brain className="w-4 h-4" style={{ color: greenAccent.primary }} /><span className="text-sm font-bold" style={{ color: neonColors.textPrimary }}>Latest Analysis</span></div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: analysis.bias === 'bullish' ? `${greenAccent.primary}20` : analysis.bias === 'bearish' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: analysis.bias === 'bullish' ? greenAccent.primary : analysis.bias === 'bearish' ? '#ef4444' : '#f59e0b' }}>{analysis.bias.toUpperCase()}</span>
          </div>
          <p className="text-xs mb-3" style={{ color: neonColors.textSecondary }}>{analysis.insight}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}><span className="text-[10px] block" style={{ color: neonColors.textDim }}>Confidence</span><span className="text-sm font-bold" style={{ color: neonColors.textPrimary }}>{analysis.confidence}%</span></div>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}><span className="text-[10px] block" style={{ color: neonColors.textDim }}>Patterns</span><span className="text-sm font-bold" style={{ color: neonColors.textPrimary }}>{analysis.patterns?.length || 0}</span></div>
          </div>
          <button onClick={() => setShowProModal(true)} className="w-full py-3 rounded-lg text-sm font-medium" style={{ background: `${greenAccent.primary}15`, color: greenAccent.primary, border: `1px solid ${greenAccent.primary}30` }}>View Full Analysis →</button>
        </div>
      )}
      {error && isApiKeySet && <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}><AlertCircle className="w-4 h-4" style={{ color: neonColors.negative }} /><span className="text-xs" style={{ color: neonColors.negative }}>{error}</span></div>}
      <div className="h-8" aria-hidden="true" />
    </>
  );

  if (insightOnly) {
    return (
      <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#050505] relative">
        <style>{neonAnimations}</style>
        {/* 5 selectable asset cards: XAUUSD, BTCUSD, US30, NAS100, SPX — replaces top bar + select */}
        <InsightAssetCards selectedInternal={symbol} onSelect={setSymbol} />
        {/* Timeframe: Robinhood-style dark green, expanded (1W) */}
        <div className="shrink-0 px-4 pb-3">
          <TimeframeSelector variant="insight" selectedTimeframe={timeframe} onSelect={setTimeframe} size="md" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-0">
          <div className="flex flex-col h-full w-full overflow-x-hidden custom-scrollbar" data-mecca-ai-scroll style={{ touchAction: 'pan-y' }}>{aiPanelScrollContent}</div>
        </div>
        <ProAnalysisModal isOpen={showProModal} onClose={() => setShowProModal(false)} analysis={proAnalysis} isLoading={isAnalyzing || isFetchingCandles} error={error} displaySymbol={getInsightDisplayName(symbol)} />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#050505] relative">
      <style>{neonAnimations}</style>

      {/* ============ MOBILE/TABLET LAYOUT (matches Journal XX: p-4 pb-24, SpotlightCard) ============ */}
      {!isDesktop ? (
        <div className="flex flex-col h-full min-h-0 flex-1">
          {/* Portal: only the mobile-instance (lg:hidden) portals here to avoid duplicates when both mobile+desktop Mecca mount. */}
          {/* Portal 1: Session only into asset-slot (logo and session leveled in header row 1) */}
          {isMobileInstance && typeof document !== 'undefined' && (() => {
            const slot = document.getElementById('mecca-mobile-asset-slot');
            if (!slot) return null;
            return createPortal(
              <div className="rounded-lg border border-white/5 bg-slate-900/50 px-1.5 py-0.5 shrink-0">
                <SessionIndicators slim />
              </div>,
              slot
            );
          })()}
          {/* Portal 2: Ticker into ticker-slot — edge-to-edge full-width row */}
          {isMobileInstance && typeof document !== 'undefined' && (() => {
            const slot = document.getElementById('mecca-mobile-ticker-slot');
            if (!slot) return null;
            return createPortal(
              <div className="w-full min-w-0 overflow-hidden">
                <NewsTicker slim />
              </div>,
              slot
            );
          })()}

          {/* Swipeable containers - Journal XX: p-4 pb-24 each, separate SpotlightCard per slide, orange indicator right */}
          <div
            className="flex-1 relative overflow-hidden"
            onTouchStart={onMeccaTouchStart}
            onTouchMove={onMeccaTouchMove}
            onTouchEnd={onMeccaTouchEnd}
            onMouseDown={onMeccaMouseDown}
            onMouseUp={onMeccaMouseUp}
            onMouseLeave={onMeccaMouseLeave}
            onWheel={onMeccaWheel}
            style={{ touchAction: 'none' }}
          >
            <div className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ transform: `translateY(-${activeMeccaSlide * 100}%)` }}>
              {/* Slide 0: Chart - TradingView fills the card edge-to-edge, no title/asset/timeframe bars */}
              <div className="w-full h-full p-4 pb-24 flex flex-col">
                <MeccaSpotlightCard variant="journal" className="flex-1 w-full" noPadding>
                  <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <TradingViewWidget symbol={symbol} timeframe={timeframe} height={280} isDarkMode={true} className="h-full w-full" />
                  </div>
                </MeccaSpotlightCard>
              </div>

              {/* Slide 1: Economic Calendar - fills the card edge-to-edge, no title */}
              <div className="w-full h-full p-4 pb-24">
                <MeccaSpotlightCard variant="journal" className="h-full w-full" noPadding>
                  <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <NewsCalendar />
                  </div>
                </MeccaSpotlightCard>
              </div>

              {/* Slide 2: AI Analysis - hidden when hideAiPanel (AI moved to Insight tab) */}
              {!hideAiPanel && (
              <div className="w-full h-full p-4 pb-24">
                <MeccaSpotlightCard variant="journal" className="h-full w-full" noPadding>
                  <div className="flex flex-col h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-4" data-mecca-ai-scroll style={{ touchAction: 'pan-y' }}>{aiPanelScrollContent}</div>
                </MeccaSpotlightCard>
              </div>
              )}
            </div>
            {/* Right-edge swipe zone — always receives touches for reliable slide swiping (e.g. over TradingView iframe or scrollable AI) */}
            <div
              className="absolute right-0 top-0 bottom-0 w-14 z-20"
              style={{ touchAction: 'none' }}
              onTouchStart={onMeccaTouchStart}
              onTouchMove={onMeccaTouchMoveStrip}
              onTouchEnd={onMeccaTouchEnd}
              onMouseDown={onMeccaMouseDown}
              onMouseUp={onMeccaMouseUp}
              onMouseLeave={onMeccaMouseLeave}
              aria-hidden
            />
            {/* Orange indicator on right - 2 dots when hideAiPanel, 3 when not */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 pointer-events-none">
              {Array.from({ length: maxMeccaSlide + 1 }, (_, i) => i).map((i) => (
                <div key={i} className={`w-1.5 rounded-full transition-all duration-300 ${activeMeccaSlide === i ? 'h-8 bg-amber-500' : 'h-1.5 bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ============ DESKTOP LAYOUT (Journal XX: p-6 gap-6, SpotlightCards) ============ */
        <>
          <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6 min-h-0 overflow-hidden">
            {/* Left - News Calendar in Journal XX SpotlightCard */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col min-h-0">
              <MeccaSpotlightCard variant="journal" className="flex-1 min-h-[320px]">
                <NewsCalendar />
              </MeccaSpotlightCard>
            </div>

            {/* Right - Session bar, Chart, Ticker, AI */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
              {/* Session + Timeframe bar - Journal XX glass (blur, border) */}
              <div
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <SessionIndicators />
                <TimeframeSelector selectedTimeframe={timeframe} onSelect={setTimeframe} />
              </div>

              {/* Chart - Journal XX SpotlightCard */}
              <MeccaSpotlightCard variant="journal" noPadding className="flex-1 min-h-[400px] overflow-hidden">
                <div className="h-full w-full overflow-hidden rounded-[23px]">
                  <TradingViewWidget
                    symbol={symbol}
                    timeframe={timeframe}
                    height={getChartHeight()}
                    isDarkMode={true}
                    className="h-full w-full"
                  />
                </div>
              </MeccaSpotlightCard>

          {/* Asset Ticker Bar - Hidden on mobile to save space */}
          {!isMobile && <SessionTimeline selectedSymbol={symbol} onSelectSymbol={setSymbol} />}

          {/* AI Analysis - hidden when hideAiPanel (AI in Insight tab) */}
          {!hideAiPanel && (isDesktop || showAIPanel) && (
            <MeccaSpotlightCard variant="journal" className="shrink-0">
              <div className="flex flex-col gap-3">
              {/* Compact API Key Input - Inline with status */}
              <div 
                className="flex items-center gap-3 px-4 py-2 rounded-xl"
                style={{
                  background: neonColors.bgCard,
                  border: `1px solid ${apiKeyStatus === 'invalid' ? neonColors.negative : apiKeyStatus === 'valid' ? greenAccent.primary : neonColors.borderDefault}40`,
                }}
              >
                {!isApiKeySet ? (
                  <>
                    {/* Key Icon - shows status */}
                    <div
                      className="p-1.5 rounded-lg shrink-0"
                      style={{
                        background: apiKeyStatus === 'invalid' 
                          ? 'rgba(239, 68, 68, 0.2)' 
                          : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                      }}
                    >
                      {isValidatingKey ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: greenAccent.primary }} />
                      ) : apiKeyStatus === 'invalid' ? (
                        <AlertCircle className="w-3.5 h-3.5" style={{ color: neonColors.negative }} />
                      ) : (
                        <Key className="w-3.5 h-3.5 text-black" />
                      )}
                    </div>
                    {/* Input */}
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          // Reset status when user types
                          if (apiKeyStatus !== 'idle') {
                            setApiKeyStatus('idle');
                            setError(null);
                          }
                        }}
                        placeholder="Enter Gemini API Key..."
                        className="w-full px-3 py-1.5 pr-8 rounded-lg text-xs focus:outline-none focus:ring-1"
                        style={{
                          background: neonColors.bgSecondary,
                          border: `1px solid ${apiKeyStatus === 'invalid' ? neonColors.negative : greenAccent.border}`,
                          color: neonColors.textPrimary,
                          // @ts-ignore - custom focus ring color
                          '--tw-ring-color': greenAccent.primary,
                        } as React.CSSProperties}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isValidatingKey) handleSetApiKey();
                        }}
                        disabled={isValidatingKey}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: neonColors.textMuted }}
                      >
                        {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                    {/* Set Button or Status */}
                    <button
                      onClick={handleSetApiKey}
                      disabled={isValidatingKey || !apiKey.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all"
                      style={{
                        background: isValidatingKey 
                          ? neonColors.bgSecondary 
                          : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                        color: isValidatingKey ? neonColors.textMuted : '#000',
                        opacity: !apiKey.trim() ? 0.5 : 1,
                        cursor: isValidatingKey || !apiKey.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isValidatingKey ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="hidden sm:inline">Validating...</span>
                        </>
                      ) : (
                        'Set'
                      )}
                    </button>
                    {/* Error message */}
                    {apiKeyStatus === 'invalid' && error && (
                      <div className="flex items-center gap-1 shrink-0" style={{ color: neonColors.negative }}>
                        <span className="text-xs">Invalid</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Key Icon - Clickable to configure */}
                    <button
                      onClick={handleClearApiKey}
                      className="p-1.5 rounded-lg shrink-0 hover:opacity-80 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                      }}
                      title="Click to change API key"
                    >
                      <Key className="w-3.5 h-3.5 text-black" />
                    </button>
                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: greenAccent.primary }} />
                      <span className="text-xs hidden sm:inline" style={{ color: neonColors.textSecondary }}>
                        Ready
                      </span>
                    </div>
                    
                    {/* Trading Style Selector */}
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
                      {TRADING_STYLES.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => {
                            setTradingStyle(style.value);
                            // Auto-select recommended timeframe for this style
                            if (style.timeframes[0] && !style.timeframes.includes(timeframe)) {
                              setTimeframe(style.timeframes[0]);
                            }
                          }}
                          className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0"
                          style={{
                            background: tradingStyle === style.value 
                              ? `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`
                              : 'transparent',
                            color: tradingStyle === style.value ? greenAccent.primary : neonColors.textMuted,
                            border: `1px solid ${tradingStyle === style.value ? greenAccent.primary : 'transparent'}`,
                          }}
                          title={style.description}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Analyze Button */}
                    <button
                      onClick={analyzeSetup}
                      disabled={isAnalyzing || !livePrice}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0"
                      style={{
                        background: isAnalyzing
                          ? neonColors.bgSecondary
                          : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                        color: isAnalyzing ? neonColors.textMuted : '#000',
                        opacity: !livePrice ? 0.5 : 1,
                        cursor: isAnalyzing || !livePrice ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="hidden sm:inline">Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Analyze</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* AI Analysis Panel - Only show when there's analysis or analyzing */}
              {(analysis || isAnalyzing || (isApiKeySet && error)) && (
                <div className="overflow-hidden">
                  <AIAnalysisPanel
                    analysis={analysis}
                    currentPrice={livePrice}
                    isAnalyzing={isAnalyzing}
                    error={isApiKeySet ? error : null}
                  />
                </div>
              )}
              </div>
            </MeccaSpotlightCard>
          )}
            </div>
          </div>
        </>
      )}
      
      {/* Pro Analysis Modal - Works on all screen sizes */}
      <ProAnalysisModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        analysis={proAnalysis}
        isLoading={isAnalyzing || isFetchingCandles}
        error={error}
        displaySymbol={getInsightDisplayName(symbol)}
      />
    </div>
  );
};

export default MeccaXXDashboard;
