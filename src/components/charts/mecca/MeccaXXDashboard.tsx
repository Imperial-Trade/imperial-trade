import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Key, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, X, Sparkles } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import MarketTickerBar from './MarketTickerBar';
import AIAnalysisPanel from './AIAnalysisPanel';
import SessionTimeline from './SessionTimeline';
import TimeframeSelector from './TimeframeSelector';
import ProAnalysisModal from './ProAnalysisModal';
import { MeccaSpotlightCard } from './MeccaSpotlightCard';
import { neonColors, neonAnimations, sessionColors } from './neonTheme';
import NewsTicker from '@/components/shared/NewsTicker';
import { ProAnalysisResult, toBasicAnalysis } from './proAnalysisTypes';
import { analyzeWithGemini } from './proAnalysisService';
import { DeconstructorPanel, DeconstructorButtons, DeconstructorPanelContent } from './DeconstructorPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

// Insight/Robinhood: dark teal–emerald gradient
const insightColors = {
  teal: '#0d9488',
  emerald: '#047857',
  dark: '#065f46',
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
  isDarkMode?: boolean;
}

const InsightAssetCards: React.FC<InsightAssetCardsProps> = ({ selectedInternal, onSelect, isDarkMode = true }) => {
  const p1 = useOptimizedLivePrice('XAUUSD', { debounceMs: 100 });
  const p2 = useOptimizedLivePrice('BTCUSD', { debounceMs: 100 });
  const p3 = useOptimizedLivePrice('U30USD', { debounceMs: 100 });
  const p4 = useOptimizedLivePrice('NDXUSD', { debounceMs: 100 });
  const p5 = useOptimizedLivePrice('SPXUSD', { debounceMs: 100 });
  const prices = [p1, p2, p3, p4, p5];
  
  const prevPricesRef = useRef<Record<string, number>>({});
  const lastDirectionRef = useRef<Record<string, 'up' | 'down'>>({});

  return (
    <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2 px-4 pt-2 pb-1.5">
      {INSIGHT_ASSETS.map(({ display, internal }, i) => {
        const priceData = prices[i] || {};
        const { livePrice, change, changePercent } = priceData;
        const prevPrice = prevPricesRef.current[internal];
        
        // Determine current direction based on price comparison
        let currentDirection: 'up' | 'down' | null = null;
        
        if (livePrice && livePrice > 0) {
          // Check if we have a previous price to compare
          if (prevPrice !== undefined && prevPrice !== null && prevPrice > 0) {
            const priceDiff = livePrice - prevPrice;
            // Use a small threshold to avoid noise
            if (Math.abs(priceDiff) > 0.01) {
              if (priceDiff > 0) {
                currentDirection = 'up';
              } else {
                currentDirection = 'down';
              }
              // Update previous price when direction changes
              prevPricesRef.current[internal] = livePrice;
              lastDirectionRef.current[internal] = currentDirection;
            } else {
              // Price hasn't changed significantly, keep last direction
              currentDirection = lastDirectionRef.current[internal] || null;
            }
          } else {
            // First time seeing this price, check change/changePercent
            if (change !== undefined && change !== null) {
              if (change > 0.01) {
                currentDirection = 'up';
              } else if (change < -0.01) {
                currentDirection = 'down';
              }
            } else if (changePercent !== undefined && changePercent !== null) {
              if (changePercent > 0.001) {
                currentDirection = 'up';
              } else if (changePercent < -0.001) {
                currentDirection = 'down';
              }
            }
            
            // Initialize previous price and direction
            if (currentDirection) {
              prevPricesRef.current[internal] = livePrice;
              lastDirectionRef.current[internal] = currentDirection;
            } else if (livePrice > 0) {
              // Initialize with price but no direction yet (default to up)
              prevPricesRef.current[internal] = livePrice;
              lastDirectionRef.current[internal] = 'up';
            }
          }
        }
        
        // Use last known direction, persist until next change
        const direction = currentDirection || lastDirectionRef.current[internal] || 'up';
        const isUp = direction === 'up';
        const isDown = direction === 'down';
        const selected = selectedInternal === internal;
        const isHovered = false; // Can add hover state if needed
        
        const selectedBg = `linear-gradient(135deg, ${insightColors.teal} 0%, ${insightColors.emerald} 50%, ${insightColors.dark} 100%)`;
        const selectedColor = '#fff';
        const selectedShadow = `0 0 12px ${insightColors.teal}50`;
        
        return (
          <button
            key={internal}
            type="button"
            onClick={() => onSelect(internal)}
            className={`relative rounded-xl p-2 md:p-2.5 transition-all duration-300 text-left border cursor-pointer ${
              selected 
                ? 'border-transparent' 
                : isHovered 
                  ? 'border-white/20'
                  : 'border-white/10'
            }`}
            style={{
              background: selected 
                ? selectedBg 
                : isHovered 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(255, 255, 255, 0.02)',
              boxShadow: selected ? selectedShadow : isHovered ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
              transform: selected ? 'scale(1.02)' : isHovered ? 'scale(1.01)' : 'scale(1)',
              pointerEvents: 'auto',
              zIndex: selected ? 10 : 1,
            }}
          >
            {/* Selected indicator dot */}
            {selected && (
              <div 
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.8)' }}
              />
            )}
            
            {/* Content */}
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 
                    className="text-xs md:text-sm font-bold mb-0.5"
                    style={{ 
                      color: selected ? selectedColor : (isHovered ? '#fff' : 'rgba(163, 163, 163, 0.9)')
                    }}
                  >
                    {display}
                  </h3>
                  <p 
                    className="text-[9px] md:text-[10px] leading-tight"
                    style={{ 
                      color: selected 
                        ? 'rgba(255,255,255,0.7)'
                        : 'rgba(163, 163, 163, 0.5)'
                    }}
                  >
                    {livePrice != null && livePrice > 0 ? livePrice.toFixed(2) : '—'}
                  </p>
                </div>
                
                {/* Price direction badge on the right */}
                <div 
                  className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] md:text-[9px] font-bold"
                  style={{
                    background: selected 
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: selected 
                      ? selectedColor 
                      : (isDown ? '#ef4444' : isUp ? '#22c55e' : 'rgba(163, 163, 163, 0.7)'),
                    border: `1px solid ${selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {isDown ? '▼' : isUp ? '▲' : '—'}
                </div>
              </div>
            </div>
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
  /** MECCA shows only Deconstructor (no charts/calendar). */
  hideAiPanel?: boolean;
  /** When true, render only the Gemini API setup / AI analysis panel (for Insight tab). */
  insightOnly?: boolean;
}

export interface MeccaXXDashboardRef {
  showApiKeySetup: () => void;
  isApiKeySet: boolean;
  openProAnalysis: (analysis: ProAnalysisResult) => void;
}

const MeccaXXDashboard = forwardRef<MeccaXXDashboardRef, MeccaXXDashboardProps>(({
  isDarkMode = true,
  mobileActiveTab: externalMobileTab,
  onMobileTabChange,
  isMobileInstance = false,
  hideAiPanel = false,
  insightOnly = false,
  touchStartY: externalTouchStartY,
  touchStartX: externalTouchStartX,
  wheelCooldown: externalWheelCooldown,
  minSwipeDistance: externalMinSwipeDistance,
  handleSwipeEnd: externalHandleSwipeEnd,
  activeTab,
}, ref) => {
  const { user } = useAuth();
  
  // State
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>('intraday');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const apiKeyModalTouchStartY = useRef<number | null>(null);
  const [assetCardsBottom, setAssetCardsBottom] = useState<number>(0);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [proAnalysis, setProAnalysis] = useState<ProAnalysisResult | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isViewingSavedAnalysis, setIsViewingSavedAnalysis] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [internalMobileTab, setInternalMobileTab] = useState<'chart' | 'economic' | 'analyze'>('chart');
  const [isBrainButtonPressed, setIsBrainButtonPressed] = useState(false);
  const [apiKeyModalAnimatedIn, setApiKeyModalAnimatedIn] = useState(false);
  
  // Use external tab if provided, otherwise use internal state
  const mobileActiveTab = externalMobileTab ?? internalMobileTab;
  const setMobileActiveTab = onMobileTabChange ?? setInternalMobileTab;

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedApiKey = localStorage.getItem('gemini_api_key');
      if (savedApiKey && savedApiKey.trim().length > 0) {
        console.log('[MeccaXXDashboard] Loading API key from localStorage');
        setApiKey(savedApiKey);
        setIsApiKeySet(true);
        setApiKeyStatus('valid');
      }
    }
  }, []);

  // Mobile swipe state (Journal XX pattern: 3 slides, vertical)
  const [activeMeccaSlide, setActiveMeccaSlide] = useState(0);
  
  // Use external swipe handlers if provided (from JournalXX), otherwise create local ones
  const internalTouchStartY = useRef<number | null>(null);
  const internalTouchStartX = useRef<number | null>(null);
  const internalWheelCooldown = useRef(false);
  const swipeDisabledRef = useRef(false); // true when touch started in AI scroll area — skip slide change, allow scroll
  
  const touchStartY = externalTouchStartY ?? internalTouchStartY;
  const touchStartX = externalTouchStartX ?? internalTouchStartX;
  const wheelCooldown = externalWheelCooldown ?? internalWheelCooldown;
  const minSwipeDistance = externalMinSwipeDistance ?? 25;
  
  // Reduced motion support
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const maxMeccaSlide = 0; // Only deconstructor slide
  
  // Use JournalXX swipe handler pattern if provided, otherwise use local one
  const handleMeccaSwipeEnd = externalHandleSwipeEnd ? (startY: number, startX: number, endY: number, endX: number, target: HTMLElement) => {
    // Only handle MECCA tab swipes
    if (activeTab !== 'MECCA') return;
    
    const dy = startY - endY; // Note: startY - endY (matches JournalXX)
    const dx = startX - endX;

    // If horizontal swipe is dominant, ignore (let native scrolling handle it)
    if (Math.abs(dx) > Math.abs(dy) * 1.5) { return; }

    const isScrollableElement = target.closest('.custom-scrollbar, .overflow-y-auto');
    let allowSwipe = true;

    if (isScrollableElement) {
        const el = isScrollableElement as HTMLElement;
        if (dy > 0) { 
           if (Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) > 2) allowSwipe = false;
        } else {
           if (el.scrollTop > 0) allowSwipe = false;
        }
    }

    if (allowSwipe) {
        if (dy > minSwipeDistance) {
             if (activeMeccaSlide < maxMeccaSlide) setActiveMeccaSlide((s) => s + 1);
        } else if (dy < -minSwipeDistance) {
             if (activeMeccaSlide > 0) setActiveMeccaSlide((s) => s - 1);
        }
    }
  } : (startY: number, startX: number, endY: number, endX: number, target: HTMLElement) => {
    const dy = startY - endY; // Match JournalXX: startY - endY
    const dx = startX - endX;
    
    // If horizontal swipe is dominant, ignore
    if (Math.abs(dx) > Math.abs(dy) * 1.5) { return; }
    
    const isScrollableElement = target.closest('.custom-scrollbar, .overflow-y-auto');
    let allowSwipe = true;

    if (isScrollableElement) {
        const el = isScrollableElement as HTMLElement;
        if (dy > 0) { 
           if (Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) > 2) allowSwipe = false;
        } else {
           if (el.scrollTop > 0) allowSwipe = false;
        }
    }
    
    if (allowSwipe) {
      if (dy > minSwipeDistance && activeMeccaSlide < maxMeccaSlide) setActiveMeccaSlide((s) => s + 1);
      else if (dy < -minSwipeDistance && activeMeccaSlide > 0) setActiveMeccaSlide((s) => s - 1);
    }
  };
  const onMeccaTouchStart = (e: React.TouchEvent) => {
    if (externalTouchStartY) {
      // Use external handler - don't set here, it's handled by JournalXX
      swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]'));
      return;
    }
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]'));
  };
  const onMeccaTouchMove = () => {};
  const onMeccaTouchMoveStrip = (e: React.TouchEvent) => { e.preventDefault(); }; // lock gesture on right-edge strip
  const onMeccaTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null || touchStartX.current == null) return;
    if (swipeDisabledRef.current) { swipeDisabledRef.current = false; if (!externalTouchStartY) { touchStartY.current = null; touchStartX.current = null; } return; }
    const target = e.target as HTMLElement;
    handleMeccaSwipeEnd(touchStartY.current, touchStartX.current, e.changedTouches[0].clientY, e.changedTouches[0].clientX, target);
    touchStartY.current = null; touchStartX.current = null;
  };
  const onMeccaMouseDown = (e: React.MouseEvent) => { 
    if (externalTouchStartY) {
      swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]'));
      return;
    }
    touchStartY.current = e.clientY; 
    touchStartX.current = e.clientX; 
    swipeDisabledRef.current = !!((e.target as Element).closest?.('[data-mecca-ai-scroll]')); 
  };
  const onMeccaMouseUp = (e: React.MouseEvent) => {
    if (touchStartY.current == null || touchStartX.current == null) return;
    if (swipeDisabledRef.current) { swipeDisabledRef.current = false; if (!externalTouchStartY) { touchStartY.current = null; touchStartX.current = null; } return; }
    const target = e.target as HTMLElement;
    handleMeccaSwipeEnd(touchStartY.current, touchStartX.current, e.clientY, e.clientX, target);
    touchStartY.current = null; touchStartX.current = null;
  };
  const onMeccaMouseLeave = () => { 
    if (!externalTouchStartY) {
      touchStartY.current = null; 
      touchStartX.current = null; 
    }
  };
  const onMeccaWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return;
    const dy = e.deltaY;
    if (Math.abs(dy) > 30) {
      if (dy > 0 && activeMeccaSlide < maxMeccaSlide) { setActiveMeccaSlide((s) => s + 1); wheelCooldown.current = true; setTimeout(() => { wheelCooldown.current = false; }, 400); }
      else if (dy < 0 && activeMeccaSlide > 0) { setActiveMeccaSlide((s) => s - 1); wheelCooldown.current = true; setTimeout(() => { wheelCooldown.current = false; }, 400); }
    }
  };

  // Live price hook
  const { livePrice, change } = useOptimizedLivePrice(symbol, { debounceMs: 100 });
  
  // OANDA candles hook
  const { fetchCandles: fetchMarketCandles, isLoading: isFetchingCandles } = useMarketCandles();

  // Debug: Log when modal state changes
  useEffect(() => {
    if (showProModal || isViewingSavedAnalysis) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:603',message:'State changed',data:{showProModal,isViewingSavedAnalysis,hasProAnalysis:!!proAnalysis,portalCondition:showProModal&&isViewingSavedAnalysis,hasDocument:typeof document!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[MeccaXXDashboard] showProModal changed to true', {
        hasProAnalysis: !!proAnalysis,
        isViewingSavedAnalysis,
        isAnalyzing,
        isFetchingCandles,
      });
    }
  }, [showProModal, proAnalysis, isViewingSavedAnalysis, isAnalyzing, isFetchingCandles]);

  // Force portal rendering via useEffect - ensures it renders even when parent is hidden
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, []);

  // Render portal content when conditions are met
  useEffect(() => {
    if (showProModal && isViewingSavedAnalysis && proAnalysis && portalContainer) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:620',message:'useEffect - Portal conditions met, should render',data:{showProModal,isViewingSavedAnalysis,hasProAnalysis:!!proAnalysis,hasPortalContainer:!!portalContainer},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  }, [showProModal, isViewingSavedAnalysis, proAnalysis, portalContainer]);

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
        // Store API key in localStorage for use by other components (like Deconstructor)
        if (typeof window !== 'undefined') {
          localStorage.setItem('gemini_api_key', apiKey.trim());
        }
        
        // Update API key (works for both setting and changing)
        setIsApiKeySet(true);
        setApiKeyStatus('valid');
        setError(null);
        setShowApiKeySetup(false);
        setShowApiKeyModal(false);
        // Clear the input field after successful update
        setApiKey('');
        console.log('[MeccaXXDashboard] API key successfully updated and stored, isApiKeySet:', true);
        // Force a re-render by triggering a small delay to ensure state propagates
        setTimeout(() => {
          console.log('[MeccaXXDashboard] State check after API key update, isApiKeySet:', true);
        }, 100);
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

  const handleRemoveApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gemini_api_key');
    }
    setApiKey('');
    setIsApiKeySet(false);
    setApiKeyStatus('idle');
    setError(null);
    setShowApiKeyModal(false);
    setShowApiKeySetup(false);
    console.log('[MeccaXXDashboard] API key removed');
  }, []);

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    setIsApiKeySet(false);
    setApiKeyStatus('idle');
    setAnalysis(null);
    setError(null);
  }, []);

  // Handle swipe down to close modal
  const handleApiKeyModalTouchStart = (e: React.TouchEvent) => {
    apiKeyModalTouchStartY.current = e.touches[0].clientY;
  };

  const handleApiKeyModalTouchMove = (e: React.TouchEvent) => {
    if (apiKeyModalTouchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - apiKeyModalTouchStartY.current;
    
    // Only allow downward swipes
    if (deltaY > 0) {
      const modal = e.currentTarget as HTMLElement;
      modal.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleApiKeyModalTouchEnd = (e: React.TouchEvent) => {
    if (apiKeyModalTouchStartY.current === null) return;
    const currentY = e.changedTouches[0].clientY;
    const deltaY = currentY - apiKeyModalTouchStartY.current;
    const modal = e.currentTarget as HTMLElement;
    
    // If swiped down more than 100px, close the modal
    if (deltaY > 100) {
      setShowApiKeyModal(false);
      setShowApiKeySetup(false);
    } else {
      // Reset position
      modal.style.transform = '';
    }
    
    apiKeyModalTouchStartY.current = null;
  };

  // Load API key from localStorage when modal opens
  useEffect(() => {
    if (showApiKeyModal && typeof window !== 'undefined') {
      const savedApiKey = localStorage.getItem('gemini_api_key');
      if (savedApiKey && savedApiKey.trim().length > 0) {
        setApiKey(savedApiKey);
        setIsApiKeySet(true);
        setApiKeyStatus('valid');
      } else {
        setApiKey('');
        setIsApiKeySet(false);
        setApiKeyStatus('idle');
      }
    }
  }, [showApiKeyModal]);

  // Slide-up animation: start off-screen then animate in when API key modal opens
  useEffect(() => {
    if (showApiKeyModal) {
      setApiKeyModalAnimatedIn(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setApiKeyModalAnimatedIn(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setApiKeyModalAnimatedIn(false);
    }
  }, [showApiKeyModal]);

  // Expose API key setup method via ref
  // Add isApiKeySet as dependency so the ref updates when API key status changes
  useImperativeHandle(ref, () => ({
    showApiKeySetup: () => {
      console.log('[MeccaXXDashboard] showApiKeySetup called, isApiKeySet:', isApiKeySet, 'current showApiKeyModal:', showApiKeyModal);
      // Always show modal - allow setting or changing API key
      // Load existing API key from localStorage if available
      if (typeof window !== 'undefined') {
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey && savedApiKey.trim().length > 0) {
          setApiKey(savedApiKey);
          setIsApiKeySet(true);
          setApiKeyStatus('valid');
        } else {
      setApiKey('');
          setIsApiKeySet(false);
      setApiKeyStatus('idle');
        }
      }
      setError(null);
      setShowApiKeyModal(true);
      setShowApiKeySetup(true);
      console.log('[MeccaXXDashboard] After setting, showApiKeyModal should be true');
    },
    get isApiKeySet() {
      console.log('[MeccaXXDashboard] isApiKeySet getter called, returning:', isApiKeySet);
      return isApiKeySet;
    },
    openProAnalysis: (analysis: ProAnalysisResult) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:746',message:'openProAnalysis ENTRY',data:{hasAnalysis:!!analysis,analysisKeys:analysis?Object.keys(analysis):[],hasTradeSetup:!!analysis?.tradeSetup,hasExecutiveSummary:!!analysis?.executiveSummary},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.log('[MeccaXXDashboard] openProAnalysis called with saved analysis:', analysis);
      console.log('[MeccaXXDashboard] Analysis has executiveSummary:', analysis?.executiveSummary);
      console.log('[MeccaXXDashboard] Analysis has tradeSetup:', analysis?.tradeSetup);
      console.log('[MeccaXXDashboard] Analysis keys:', analysis ? Object.keys(analysis) : 'null');
      
      // Validate analysis before opening
      if (!analysis || !analysis.tradeSetup || !analysis.executiveSummary) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:753',message:'VALIDATION FAILED',data:{hasAnalysis:!!analysis,hasTradeSetup:!!analysis?.tradeSetup,hasExecutiveSummary:!!analysis?.executiveSummary},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('[MeccaXXDashboard] Invalid analysis provided to openProAnalysis:', {
          has_analysis: !!analysis,
          has_tradeSetup: !!analysis?.tradeSetup,
          has_executiveSummary: !!analysis?.executiveSummary,
        });
        setError('Invalid analysis data. Please try again.');
        return;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:763',message:'BEFORE state updates',data:{currentShowProModal:showProModal,currentIsViewingSavedAnalysis:isViewingSavedAnalysis,currentProAnalysis:!!proAnalysis},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // Use a function to ensure state updates are applied immediately
      setError(null);
      setIsViewingSavedAnalysis(true);
      setIsAnalyzing(false);
      
      // Set analysis and open modal in the same batch
      setProAnalysis(analysis);
      setShowProModal(true);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:770',message:'AFTER state updates called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('[MeccaXXDashboard] Modal state set - showProModal: true, proAnalysis:', !!analysis);
      
      // Force a re-render after state updates to ensure portal renders even when parent is hidden
      setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:775',message:'Timeout callback - checking state',data:{showProModal,isViewingSavedAnalysis,hasProAnalysis:!!proAnalysis},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.log('[MeccaXXDashboard] After timeout - verifying modal state');
        // Force another update to ensure portal renders
        setShowProModal((prev) => {
          if (!prev) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:779',message:'showProModal was false - forcing true',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            console.warn('[MeccaXXDashboard] showProModal was false, forcing to true');
            return true;
          }
          return prev;
        });
        // Also ensure analysis is still set
        if (!proAnalysis) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MeccaXXDashboard.tsx:786',message:'proAnalysis was cleared - restoring',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          console.warn('[MeccaXXDashboard] proAnalysis was cleared, restoring it');
          setProAnalysis(analysis);
        }
      }, 50);
    },
  }), [isApiKeySet, showApiKeyModal]); // Add dependencies so ref updates when these change

  // Pro Analysis handler - fetches market data and uses institutional-grade Gemini prompt
  const analyzeSetup = useCallback(async () => {
    console.log('[ProAnalysis] ========== ANALYZE BUTTON CLICKED ==========');
    console.log('[ProAnalysis] isApiKeySet:', isApiKeySet);
    console.log('[ProAnalysis] livePrice:', livePrice);
    console.log('[ProAnalysis] symbol:', symbol);
    console.log('[ProAnalysis] timeframe (chart):', timeframe);
    console.log('[ProAnalysis] tradingStyle:', tradingStyle);
    console.log('[ProAnalysis] user:', user ? { id: user.id, email: user.email } : 'null');
    
    if (!isApiKeySet) {
      console.log('[ProAnalysis] ERROR: API key not set');
      setError('Please set your API key first');
      return;
    }

    if (!user?.id) {
      console.error('[ProAnalysis] ERROR: User not authenticated. Cannot save analysis.');
      setError('Please log in to save analysis results');
      // Continue with analysis but warn that it won't be saved
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

    // Small delay for pre-loading animation before starting analysis
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setProAnalysis(null);
    setShowProModal(false); // Keep modal closed during loading - show loading modal instead

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
      
      // Ensure API key is available (check both state and localStorage)
      let apiKeyToUse = apiKey;
      if (!apiKeyToUse || apiKeyToUse.trim().length === 0) {
        if (typeof window !== 'undefined') {
          apiKeyToUse = localStorage.getItem('gemini_api_key') || '';
        }
      }
      
      if (!apiKeyToUse || apiKeyToUse.trim().length === 0) {
        throw new Error('API key not found. Please set your API key first.');
      }
      
      console.log('[ProAnalysis] Using API key (length:', apiKeyToUse.length, ')');
      
      const proResult = await analyzeWithGemini(
        apiKeyToUse,
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
      // Clear the saved analysis flag since this is a new analysis
      setIsViewingSavedAnalysis(false);
      
      // Also set basic analysis for the side panel (backward compatibility)
      const basicResult = toBasicAnalysis(proResult);
      setAnalysis(basicResult);
      
      // Save analysis to database
      if (user?.id) {
        try {
          console.log('[ProAnalysis] Attempting to save analysis to database...', {
            user_id: user.id,
            symbol,
            timeframe,
            trading_style: tradingStyle || 'intraday',
            current_price: currentPriceValue,
            has_analysis_result: !!proResult,
            analysis_keys: proResult ? Object.keys(proResult) : [],
          });
          
          // Validate analysis result before saving
          if (!proResult || !proResult.tradeSetup || !proResult.executiveSummary) {
            console.error('[ProAnalysis] Invalid analysis result structure, cannot save:', {
              has_proResult: !!proResult,
              has_tradeSetup: !!proResult?.tradeSetup,
              has_executiveSummary: !!proResult?.executiveSummary,
            });
          } else {
            const { data, error: dbError } = await supabase
              .from('insight_xx_analyses')
              .insert({
                user_id: user.id,
                symbol: symbol,
                timeframe: timeframe,
                trading_style: tradingStyle || 'intraday',
                current_price: currentPriceValue,
                analysis_result: proResult,
              })
              .select();
            
            if (dbError) {
              console.error('[ProAnalysis] ❌ Error saving analysis to database:', dbError);
              console.error('[ProAnalysis] Error details:', {
                message: dbError.message,
                details: dbError.details,
                hint: dbError.hint,
                code: dbError.code,
              });
              // Don't throw - analysis still completed successfully, just not saved
              console.warn('[ProAnalysis] Analysis completed but not saved. User can still view it.');
            } else {
              console.log('[ProAnalysis] ✅ Analysis saved to database successfully:', data);
              console.log('[ProAnalysis] Saved analysis ID:', data?.[0]?.id);
            }
          }
        } catch (saveError) {
          console.error('[ProAnalysis] ❌ Exception saving analysis:', saveError);
          if (saveError instanceof Error) {
            console.error('[ProAnalysis] Error message:', saveError.message);
            console.error('[ProAnalysis] Error stack:', saveError.stack);
          }
          // Don't throw - analysis still completed successfully
        }
      } else {
        console.warn('[ProAnalysis] ⚠️ User not available, skipping database save.', {
          user: user,
          user_id: user?.id,
        });
        console.warn('[ProAnalysis] Analysis will not be saved to history. Please log in to save analyses.');
      }
      
      // Automatically open modal with results when analysis completes
      setShowProModal(true);
      
    } catch (err) {
      console.error('[ProAnalysis] Error:', err);
      setError((err as Error).message || 'Failed to analyze setup');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isApiKeySet, symbol, timeframe, tradingStyle, apiKey, livePrice, fetchMarketCandles, user, user?.id]);

  // Typewriter effect that types and erases "Preparing Analysis..."
  const [typewriterText, setTypewriterText] = useState('');
  const typewriterStateRef = useRef({ index: 0, isErasing: false, phase: 'typing' as 'typing' | 'waiting' | 'erasing' });
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timeout
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }
    
    if (isAnalyzing || isFetchingCandles) {
      const text = 'Preparing Analysis...';
      const state = typewriterStateRef.current;
      
      const typeAndErase = () => {
        if (state.phase === 'typing') {
          if (state.index < text.length) {
            setTypewriterText(text.substring(0, state.index + 1));
            state.index++;
            typewriterTimeoutRef.current = setTimeout(typeAndErase, 100);
          } else {
            // Finished typing, wait then start erasing
            state.phase = 'waiting';
            typewriterTimeoutRef.current = setTimeout(() => {
              state.phase = 'erasing';
              state.index = text.length;
              typeAndErase();
            }, 1000);
          }
        } else if (state.phase === 'erasing') {
          if (state.index > 0) {
            setTypewriterText(text.substring(0, state.index - 1));
            state.index--;
            typewriterTimeoutRef.current = setTimeout(typeAndErase, 50);
          } else {
            // Finished erasing, restart typing
            state.phase = 'typing';
            state.index = 0;
            typewriterTimeoutRef.current = setTimeout(typeAndErase, 200);
          }
        }
      };
      
      // Start typing
      state.phase = 'typing';
      state.index = 0;
      state.isErasing = false;
      typeAndErase();
    } else {
      setTypewriterText('');
      typewriterStateRef.current = { index: 0, isErasing: false, phase: 'typing' };
    }
    
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, [isAnalyzing, isFetchingCandles]);

  // Shared AI panel body (Gemini setup, trading style, analyze, results) — used in MECCA slide 2 and Insight-only view
  const aiPanelScrollContent = (
    <>
      
      {/* Typewriter text when analyzing starts - shows in SpotlightCard before modal appears */}
      {isApiKeySet && (isAnalyzing || isFetchingCandles) && typewriterText && (
        <div className="flex-1 min-h-0 flex items-center justify-center p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-lg font-medium" style={{ color: isDarkMode ? neonColors.textPrimary : '#1f2937' }}>
              {typewriterText}
              <span className="inline-block w-[2px] h-[1em] bg-emerald-400 animate-pulse ml-1" />
            </p>
          </div>
        </div>
      )}
      
      {analysis && proAnalysis && (
          <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white'} border ${isDarkMode ? 'border-white/10' : 'border-black/10'}`} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" style={{ color: greenAccent.primary }} /><span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Latest Analysis</span></div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: analysis.bias === 'bullish' ? `${greenAccent.primary}20` : analysis.bias === 'bearish' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: analysis.bias === 'bullish' ? greenAccent.primary : analysis.bias === 'bearish' ? '#ef4444' : '#f59e0b' }}>{analysis.bias.toUpperCase()}</span>
          </div>
          <p className={`text-[10px] mb-2 leading-tight ${isDarkMode ? 'text-slate-300' : 'text-stone-700'}`}>{analysis.insight}</p>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}><span className={`text-[9px] block ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Confidence</span><span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{analysis.confidence}%</span></div>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}><span className={`text-[9px] block ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>Patterns</span><span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{analysis.patterns?.length || 0}</span></div>
          </div>
          <button 
            onClick={() => {
              // Use the same logic as openProAnalysis but for current analysis
              console.log('[MeccaXXDashboard] View Full Analysis button clicked, opening modal with current analysis');
              setError(null);
              setIsViewingSavedAnalysis(false); // This is a new analysis, not saved
              setIsAnalyzing(false);
              // proAnalysis is already set, just ensure modal opens
              setShowProModal(true);
            }} 
            className="w-full py-2 rounded-lg text-xs font-medium" 
            style={{ background: `${greenAccent.primary}15`, color: greenAccent.primary, border: `1px solid ${greenAccent.primary}30` }}
          >
            View Full Analysis →
          </button>
        </div>
      )}
      {error && isApiKeySet && <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}><AlertCircle className="w-3 h-3" style={{ color: neonColors.negative }} /><span className="text-[10px]" style={{ color: neonColors.negative }}>{error}</span></div>}
    </>
  );

  if (insightOnly) {
    // Detect mobile for bottom nav spacing - use window width directly for immediate detection
    const [isMobileState, setIsMobileState] = useState(false);
    
    useEffect(() => {
      const checkMobile = () => {
        setIsMobileState(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get asset cards bottom position for modal positioning
    useEffect(() => {
      const updateAssetCardsPosition = () => {
        // Find the asset cards container
        const assetCardsContainer = document.querySelector('.insight-asset-cards-container') as HTMLElement;
        if (assetCardsContainer) {
          const rect = assetCardsContainer.getBoundingClientRect();
          setAssetCardsBottom(rect.bottom);
        } else {
          // Fallback: calculate based on header + trading types + asset cards
          const headerHeight = isMobileState ? 72 : 80;
          const tradingTypesHeight = 48; // ~3rem
          const assetCardsHeight = 64; // ~4rem
          setAssetCardsBottom(headerHeight + tradingTypesHeight + assetCardsHeight);
        }
      };
      updateAssetCardsPosition();
      window.addEventListener('resize', updateAssetCardsPosition);
      window.addEventListener('scroll', updateAssetCardsPosition);
      if (showApiKeyModal) {
        setTimeout(updateAssetCardsPosition, 100);
      }
      return () => {
        window.removeEventListener('resize', updateAssetCardsPosition);
        window.removeEventListener('scroll', updateAssetCardsPosition);
      };
    }, [showApiKeyModal, isMobileState]);
    
    // Calculate bottom nav height with safe area for mobile
    const bottomNavHeight = 64; // Standard bottom nav height
    const extraPadding = 8; // Extra padding above nav bar
    const mobileBottomSpace = isMobileState ? bottomNavHeight + extraPadding : 0;
    
    return (
      <div 
        className={`w-full flex-1 min-h-0 flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#050505]' : 'bg-[#F0F0F0]'} relative`}
        style={{
          height: '100%',
          maxHeight: '100%',
          paddingBottom: 0,
          marginBottom: 0,
        }}
      >
        <style>{neonAnimations}
          {`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes slideUp {
              from { 
                transform: translateY(100%);
                opacity: 0;
              }
              to { 
                transform: translateY(0);
                opacity: 1;
              }
            }
            @keyframes brain-think {
              0%, 100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
              25% {
                transform: scale(1.05) rotate(-2deg);
                opacity: 0.9;
              }
              50% {
                transform: scale(1.1) rotate(0deg);
                opacity: 1;
              }
              75% {
                transform: scale(1.05) rotate(2deg);
                opacity: 0.9;
              }
            }
            .shimmer-animation {
              animation: shimmer 2s infinite;
            }
          `}
        </style>
        {/* Trading Types: Scalping, Intraday, Swing, Position - can shrink on short screens */}
        <div className="min-h-[52px] flex-shrink px-4 pt-3 pb-2">
          <TimeframeSelector 
            variant="insight" 
            selectedTimeframe={timeframe} 
            onSelect={(tf) => {
              setTimeframe(tf);
              // Sync trading style based on selected timeframe
              const style = TRADING_STYLES.find(s => s.timeframes.includes(tf));
              if (style) {
                setTradingStyle(style.value);
              }
            }} 
            size="md" 
            showTradingTypes={true} 
          />
        </div>
        {/* 5 selectable asset cards - can shrink on short screens (same layer as brain) */}
        <div className="insight-asset-cards-container min-h-[64px] flex-shrink">
        <InsightAssetCards selectedInternal={symbol} onSelect={setSymbol} isDarkMode={isDarkMode} />
              </div>
        
        {/* Brain button - same layer as asset cards, no absolute overlay */}
        {!analysis && !isAnalyzing && !isFetchingCandles && (
          <div className="flex-1 min-h-[120px] flex items-center justify-center py-4">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full" 
                style={{ 
                  border: `2px solid ${greenAccent.primary}`, 
                  opacity: 0.3, 
                  margin: '-20px', 
                  width: 'calc(100% + 40px)', 
                  height: 'calc(100% + 40px)',
                  animation: isBrainButtonPressed ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} 
              />
              <button
                onClick={analyzeSetup}
                disabled={isAnalyzing || isFetchingCandles || !livePrice}
                className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer touch-manipulation relative"
                style={{ 
                  background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`, 
                  border: `3px solid ${greenAccent.primary}80`,
                  animation: isBrainButtonPressed ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  boxShadow: isBrainButtonPressed
                    ? `0 0 30px ${greenAccent.glow}, inset 0 0 15px ${greenAccent.glow}30, 0 4px 8px rgba(0, 0, 0, 0.3)`
                    : `0 0 50px ${greenAccent.glow}, inset 0 0 25px ${greenAccent.glow}50, 0 8px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(34, 197, 94, 0.2)`,
                  transform: isBrainButtonPressed
                    ? 'perspective(1000px) translateZ(-8px) rotateX(5deg) scale(0.95)'
                    : 'perspective(1000px) translateZ(12px) rotateX(-5deg)',
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  WebkitTapHighlightColor: 'transparent',
                  opacity: !livePrice ? 0.5 : 1,
                  isolation: 'isolate',
                }}
                onPointerDown={() => {
                  if (!isAnalyzing && !isFetchingCandles && livePrice) {
                    setIsBrainButtonPressed(true);
                  }
                }}
                onPointerUp={() => setIsBrainButtonPressed(false)}
                onPointerLeave={() => setIsBrainButtonPressed(false)}
                onPointerCancel={() => setIsBrainButtonPressed(false)}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${greenAccent.primary}40, transparent 70%)`,
                    opacity: isBrainButtonPressed ? 0.6 : 0.8,
                    transition: 'opacity 0.15s ease',
                    transform: 'translateZ(4px)',
                  }}
                />
                <Brain 
                  className="w-10 h-10 relative z-10" 
                  style={{ 
                    color: greenAccent.primary,
                    animation: isBrainButtonPressed ? 'none' : 'brain-think 1.5s ease-in-out infinite',
                    filter: `drop-shadow(0 0 8px ${greenAccent.glow})`,
                    transform: isBrainButtonPressed
                      ? 'translateZ(4px) scale(0.9)'
                      : 'translateZ(8px)',
                    transition: 'transform 0.15s ease',
                    pointerEvents: 'none',
                  }} 
                />
              </button>
            </div>
          </div>
        )}
        
        {/* SpotlightCard Container - Only when analysis (or analyzing/fetching); min height so area never collapses */}
        {(analysis || isAnalyzing || isFetchingCandles) && (
        <div 
          className="flex-1 min-h-0 relative insight-spotlight-container overflow-hidden"
          style={{
            minHeight: 120,
            paddingBottom: 0,
            marginBottom: 0,
            padding: 0,
            background: 'transparent',
          }}
        >
          <MeccaSpotlightCard 
            variant="journal" 
            className="h-full w-full flex flex-col relative" 
            noPadding 
            isDarkMode={isDarkMode}
            style={{
              borderRadius: 0,
              height: '100%',
              maxHeight: '100%',
              overflow: 'hidden',
            }}
          >
            <div 
              className="flex flex-col w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto custom-scrollbar relative" 
              style={{ 
                touchAction: 'pan-y', 
                width: '100%', 
                maxWidth: '100%', 
                boxSizing: 'border-box',
                padding: '0.75rem',
                paddingBottom: isApiKeySet ? '0.5rem' : '0.75rem',
              }}
              data-mecca-ai-scroll
            >
              {aiPanelScrollContent}
            </div>
          </MeccaSpotlightCard>
        </div>
        )}
        {/* Modals - portaled to journal-xx-modal-root when in Journal XX (History page) so they show inside the page */}
        {createPortal(
          <>
            {/* Loading Modal - Slides up from bottom with smooth transition */}
            {isAnalyzing || isFetchingCandles ? (
              <div 
                className="fixed inset-0 z-[9999] transition-opacity duration-300"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div 
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                  style={{
                    transform: 'translateY(0)',
                    paddingTop: '2rem',
                    paddingBottom: 'max(6rem, calc(6rem + env(safe-area-inset-bottom, 0px)))',
                    animation: 'slideUp 0.5s cubic-bezier(0.32, 0.72, 0, 1)'
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-8 p-8 w-full max-w-md">
                    {/* Animated Brain Icon with pulsing circles */}
                    <div className="relative">
                      {/* Outer pulsing circle - animated ping */}
                      <div 
                        className="absolute inset-0 rounded-full" 
                        style={{ 
                          border: `3px solid ${greenAccent.primary}`, 
                          opacity: 0.2, 
                          margin: '-32px', 
                          width: 'calc(100% + 64px)', 
                          height: 'calc(100% + 64px)',
                          animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                        }} 
                      />
                      {/* Middle pulsing circle */}
                      <div 
                        className="absolute inset-0 rounded-full" 
                        style={{ 
                          border: `2px solid ${greenAccent.primary}`, 
                          opacity: 0.4, 
                          margin: '-20px', 
                          width: 'calc(100% + 40px)', 
                          height: 'calc(100% + 40px)',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }} 
                      />
                      {/* Brain icon container */}
                      <div 
                        className="w-28 h-28 rounded-full flex items-center justify-center" 
                        style={{ 
                          background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`, 
                          border: `3px solid ${greenAccent.primary}60`,
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          boxShadow: `0 0 40px ${greenAccent.primary}40`
                        }}
                      >
                        <Brain className="w-14 h-14" style={{ color: greenAccent.primary }} />
                      </div>
                    </div>
                    {/* Text content */}
                    <div className="text-center space-y-3">
                      <p className="font-semibold text-xl text-white">
                        Analyzing {getInsightDisplayName(symbol)}...
                      </p>
                      <p className="text-sm text-gray-400 max-w-xs">
                        Processing market data and generating insights
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {/* Results Modal - portaled to journal-xx-modal-root when in Journal XX */}
            <ProAnalysisModal 
              isOpen={showProModal && !isAnalyzing && !isFetchingCandles} 
              onClose={() => {
                setShowProModal(false);
                setIsViewingSavedAnalysis(false);
              }} 
              analysis={proAnalysis} 
              isLoading={false} 
              error={error} 
              displaySymbol={getInsightDisplayName(symbol)} 
            />
          </>,
          (typeof document !== 'undefined' && document.getElementById('journal-xx-modal-root')) || document.body
        )}

        {/* API Key Setup Modal - Slides up from bottom to 1/3 of screen */}
        {showApiKeyModal && typeof document !== 'undefined' && createPortal(
          <>
            {/* Backdrop - Transparent (no darkening) */}
            <div 
              className="fixed inset-0 z-[99998] bg-transparent transition-opacity duration-300"
              onClick={() => {
                setShowApiKeyModal(false);
                setShowApiKeySetup(false);
              }}
            />
            
            {/* Modal - Glassmorphism sheet, slides up from bottom */}
            <div
              className="fixed left-0 right-0 z-[99999] rounded-t-3xl shadow-2xl border-t backdrop-blur-xl bg-white/75 dark:bg-[#0A0A0A]/80 dark:border-white/10 border-slate-200/50"
              style={{
                bottom: 0,
                top: 'auto',
                height: 'calc(100vh / 3)',
                maxHeight: 'calc(100vh / 3)',
                transform: apiKeyModalAnimatedIn ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
              onTouchStart={handleApiKeyModalTouchStart}
              onTouchMove={handleApiKeyModalTouchMove}
              onTouchEnd={handleApiKeyModalTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Swipe indicator - glass */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 rounded-full bg-white/20 dark:bg-white/20 backdrop-blur-sm" />
              </div>

              {/* Modal Content - Not scrollable, safe area padding */}
              <div className="h-full overflow-hidden px-4 pt-4 flex flex-col" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
                <div className={`p-3 rounded-xl flex-1 flex flex-col backdrop-blur-md border ${isDarkMode ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.04] border-slate-300/50'}`} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)` }}>
                        <Key className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{isApiKeySet ? 'Change API Key' : 'Setup Gemini API'}</h3>
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>{isApiKeySet ? 'Update your API key' : 'Required for AI analysis'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative mb-2">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={apiKey} 
                      onChange={(e) => { 
                        setApiKey(e.target.value); 
                        if (apiKeyStatus !== 'idle') { 
                          setApiKeyStatus('idle'); 
                          setError(null); 
                        } 
                      }} 
                      placeholder="Paste your API key..." 
                      className={`w-full px-3 py-2 pr-10 rounded-lg text-xs backdrop-blur-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-400' : 'bg-black/5 border-slate-300/50 text-stone-900 placeholder-slate-500'} ${apiKeyStatus === 'invalid' ? 'border-red-500' : ''}`} 
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {apiKeyStatus === 'invalid' && error && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-2 backdrop-blur-sm bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-3 h-3 shrink-0" style={{ color: neonColors.negative }} />
                      <span className="text-[10px]" style={{ color: neonColors.negative }}>{error}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleSetApiKey} 
                    disabled={isValidatingKey || !apiKey.trim()} 
                    className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" 
                    style={{ 
                      background: isValidatingKey ? neonColors.bgSecondary : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`, 
                      color: isValidatingKey ? neonColors.textMuted : '#000', 
                      opacity: !apiKey.trim() ? 0.5 : 1 
                    }}
                  >
                    {isValidatingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isApiKeySet ? 'Change API Key' : 'Set API Key'}</span>
                      </>
                    )}
                  </button>
                    {isApiKeySet && (
                      <button 
                        onClick={handleRemoveApiKey}
                        className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-red-500/30 bg-red-500/10 backdrop-blur-sm text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove API Key</span>
                      </button>
                    )}
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block text-center text-[10px] mt-2 underline" 
                    style={{ color: greenAccent.primary }}
                  >
                    Get your free API key →
                  </a>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div 
      className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#050505]' : 'bg-[#F0F0F0]'} relative`}
      style={{
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
      }}
    >
      <style>{neonAnimations}</style>

      {/* ============ MOBILE/TABLET/DESKTOP LAYOUT ============ */}
      <div 
        className="flex flex-col w-full h-full min-h-0 relative overflow-hidden"
            onTouchStart={onMeccaTouchStart}
            onTouchMove={onMeccaTouchMove}
            onTouchEnd={onMeccaTouchEnd}
            onMouseDown={onMeccaMouseDown}
            onMouseUp={onMeccaMouseUp}
            onMouseLeave={onMeccaMouseLeave}
            onWheel={onMeccaWheel}
            style={{ 
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
            }}
          >
        {/* Slides Container - Only Deconstructor */}
        <div 
          className="flex-1 min-h-0 relative"
          style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Deconstructor Slide - Full width */}
          <DeconstructorPanel isDarkMode={isDarkMode}>
            {() => (
              <div 
                className="w-full flex-shrink-0 pt-3 sm:pt-4 flex flex-col"
                style={{
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '1 1 0%',
                  paddingBottom: 'max(4.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))',
                }}
              >
                <MeccaSpotlightCard variant="journal" className="w-full flex flex-col flex-1 min-h-0 mb-3" noPadding isDarkMode={isDarkMode} style={{ 
                  height: '100%', 
                  minHeight: 0,
                  marginBottom: '0.75rem',
                }}>
                  <DeconstructorPanelContent isDarkMode={isDarkMode} />
                </MeccaSpotlightCard>
                
                {/* Upload and Deconstruct Buttons - Outside Spotlight Card, just above bottom nav */}
                <DeconstructorButtons isDarkMode={isDarkMode} />
              </div>
            )}
          </DeconstructorPanel>
        </div>
      </div>

      {/* Pro Analysis Modal - Portal version for when viewing from history (parent component may be hidden) */}
      {portalContainer && showProModal && isViewingSavedAnalysis && proAnalysis && createPortal(
        <ProAnalysisModal
          isOpen={showProModal}
          onClose={() => {
            console.log('[MeccaXXDashboard] Modal onClose called (portal version)');
            setShowProModal(false);
            setIsViewingSavedAnalysis(false);
          }}
          analysis={proAnalysis}
          isLoading={false} // Saved analysis is never loading
          error={error}
          displaySymbol={getInsightDisplayName(symbol)}
        />,
        portalContainer
      )}

      {/* API Key Setup Modal - Glassmorphism, slides up from bottom */}
      {showApiKeyModal && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop - Transparent (no darkening) */}
          <div 
            className="fixed left-0 right-0 bottom-0 z-[99998] bg-transparent transition-opacity duration-300"
            style={{
              top: typeof window !== 'undefined' && window.innerWidth < 768 ? '72px' : '80px',
            }}
            onClick={() => {
              setShowApiKeyModal(false);
              setShowApiKeySetup(false);
            }}
          />
          
          {/* Modal - Glassmorphism sheet, slides up from bottom */}
          <div
            className="fixed left-0 right-0 z-[99999] rounded-t-3xl shadow-2xl border-t backdrop-blur-xl bg-white/75 dark:bg-[#0A0A0A]/80 dark:border-white/10 border-slate-200/50"
            style={{
              bottom: 0,
              top: 'auto',
              height: 'calc(100vh / 3)',
              maxHeight: 'calc(100vh / 3)',
              transform: apiKeyModalAnimatedIn ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            onTouchStart={handleApiKeyModalTouchStart}
            onTouchMove={handleApiKeyModalTouchMove}
            onTouchEnd={handleApiKeyModalTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Swipe indicator - glass */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-white/20 dark:bg-white/20 backdrop-blur-sm" />
            </div>

            {/* Modal Content */}
            <div className="h-full overflow-y-auto custom-scrollbar px-4 pt-4" style={{ paddingBottom: 'max(6rem, calc(6rem + env(safe-area-inset-bottom, 0px)))' }}>
              <div className={`p-3 rounded-xl backdrop-blur-md border ${isDarkMode ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.04] border-slate-300/50'}`} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)` }}>
                      <Key className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{showApiKeySetup && isApiKeySet ? 'Change API Key' : 'Setup Gemini API'}</h3>
                      <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>{showApiKeySetup && isApiKeySet ? 'Update your API key' : 'Required for AI analysis'}</p>
                    </div>
                  </div>
                </div>
                <div className="relative mb-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (apiKeyStatus !== 'idle') {
                        setApiKeyStatus('idle');
                        setError(null);
                      }
                    }}
                    placeholder="Paste your API key..."
                    className={`w-full px-3 py-2 pr-10 rounded-lg text-xs backdrop-blur-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-400' : 'bg-black/5 border-slate-300/50 text-stone-900 placeholder-slate-500'} ${apiKeyStatus === 'invalid' ? 'border-red-500' : ''}`}
                  />
                  <button onClick={() => setShowApiKey(!showApiKey)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {apiKeyStatus === 'invalid' && error && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-2 backdrop-blur-sm bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-3 h-3 shrink-0" style={{ color: neonColors.negative }} />
                    <span className="text-[10px]" style={{ color: neonColors.negative }}>{error}</span>
                  </div>
                )}
                <button
                  onClick={handleSetApiKey}
                  disabled={isValidatingKey || !apiKey.trim()}
                  className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    background: isValidatingKey ? neonColors.bgSecondary : `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)`,
                    color: isValidatingKey ? neonColors.textMuted : '#000',
                    opacity: !apiKey.trim() ? 0.5 : 1,
                  }}
                >
                  {isValidatingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{showApiKeySetup && isApiKeySet ? 'Update API Key' : 'Set API Key'}</span>
                    </>
                  )}
                </button>
                {isApiKeySet && (
                  <button
                    onClick={handleRemoveApiKey}
                    className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 mt-2 border border-red-500/30 bg-red-500/10 backdrop-blur-sm text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove API Key</span>
                  </button>
                )}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-center text-[10px] mt-2 underline" 
                  style={{ color: greenAccent.primary }}
                >
                  Get your free API key →
                </a>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
      
      {/* Pro Analysis Modal - portaled to journal-xx-modal-root when in Journal XX (History page) */}
      {createPortal(
        <ProAnalysisModal
          isOpen={showProModal}
          onClose={() => setShowProModal(false)}
          analysis={proAnalysis}
          isLoading={isAnalyzing || isFetchingCandles}
          error={error}
          displaySymbol={getInsightDisplayName(symbol)}
        />,
        (typeof document !== 'undefined' && document.getElementById('journal-xx-modal-root')) || document.body
      )}
    </div>
  );
});

MeccaXXDashboard.displayName = 'MeccaXXDashboard';

export default MeccaXXDashboard;
