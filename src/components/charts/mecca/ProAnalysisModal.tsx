// Pro-Grade Analysis Modal for MECCA XX
// Sliding modal with conviction gauge and institutional-level insights

import React, { useEffect, useRef, useState } from 'react';
import { 
  X, TrendingUp, TrendingDown, Target, AlertTriangle, 
  Brain, Zap, Shield, BookOpen, ArrowUpRight, ArrowDownRight,
  ChevronUp, ChevronDown, Activity, Minus
} from 'lucide-react';
import { ProAnalysisResult } from './proAnalysisTypes';
import { neonColors } from './neonTheme';

// Green accent colors
const greenAccent = {
  primary: '#22c55e',
  light: '#4ade80',
  dark: '#16a34a',
};

interface ProAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ProAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  /** Override for symbol in header (e.g. US30 instead of U30USD). Falls back to analysis.symbol */
  displaySymbol?: string;
}

// Conviction Gauge Component (Semi-circle) - Mobile responsive
const ConvictionGauge: React.FC<{ grade: string; breakdown: ProAnalysisResult['tradeSetup']['convictionBreakdown']; isMobile?: boolean }> = ({ grade, breakdown, isMobile }) => {
  const gradeToAngle = (g: string): number => {
    const grades: Record<string, number> = {
      'A+': 170, 'A': 155, 'A-': 140,
      'B+': 125, 'B': 110, 'B-': 95,
      'C': 70, 'D': 45, 'F': 20,
    };
    return grades[g] || 90;
  };
  
  const gradeToColor = (g: string): string => {
    if (g.startsWith('A')) return greenAccent.primary;
    if (g.startsWith('B')) return '#f59e0b';
    return '#ef4444';
  };
  
  const angle = gradeToAngle(grade);
  const color = gradeToColor(grade);
  const avgScore = (breakdown.trendAlignment + breakdown.volumeProfile + breakdown.macroContext + breakdown.technicalConfluence) / 4;
  
  return (
    <div className="flex flex-col items-center w-full">
      <div className={`relative overflow-hidden ${isMobile ? 'w-28 h-14' : 'w-32 h-16'}`}>
        {/* Background arc */}
        <div 
          className="absolute inset-0 rounded-t-full"
          style={{ 
            background: `conic-gradient(from 180deg, ${neonColors.borderDefault} 0deg, ${neonColors.borderDefault} 180deg)`,
            clipPath: 'polygon(0 100%, 0 0, 100% 0, 100% 100%)',
          }}
        />
        {/* Filled arc */}
        <div 
          className="absolute inset-0 rounded-t-full transition-all duration-500"
          style={{ 
            background: `conic-gradient(from 180deg, ${color} 0deg, ${color} ${angle}deg, transparent ${angle}deg)`,
            clipPath: 'polygon(0 100%, 0 0, 100% 0, 100% 100%)',
          }}
        />
        {/* Needle */}
        <div 
          className={`absolute bottom-0 left-1/2 w-1 origin-bottom transition-transform duration-500 ${isMobile ? 'h-12' : 'h-14'}`}
          style={{ 
            transform: `translateX(-50%) rotate(${angle - 90}deg)`,
            background: `linear-gradient(to top, ${color}, transparent)`,
          }}
        />
        {/* Center circle */}
        <div 
          className={`absolute bottom-0 left-1/2 rounded-full -translate-x-1/2 translate-y-1/2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`}
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      <div className="text-center mt-2">
        <span className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`} style={{ color }}>{grade}</span>
        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: neonColors.textDim }}>Conviction</p>
      </div>
      {/* Breakdown bars - Stack on mobile */}
      <div className={`mt-3 w-full ${isMobile ? 'flex flex-col gap-1.5' : 'grid grid-cols-2 gap-2'}`}>
        {[
          { label: 'Trend', value: breakdown.trendAlignment },
          { label: 'Volume', value: breakdown.volumeProfile },
          { label: 'Macro', value: breakdown.macroContext },
          { label: 'Technical', value: breakdown.technicalConfluence },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`${isMobile ? 'text-[10px] w-14' : 'text-[9px] w-12'}`} style={{ color: neonColors.textDim }}>{item.label}</span>
            <div className={`flex-1 rounded-full overflow-hidden ${isMobile ? 'h-2' : 'h-1.5'}`} style={{ background: neonColors.borderDefault }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${item.value * 10}%`,
                  background: item.value >= 7 ? greenAccent.primary : item.value >= 5 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-[9px] w-4" style={{ color: neonColors.textMuted }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Direction Badge - Mobile responsive
const DirectionBadge: React.FC<{ direction: string }> = ({ direction }) => {
  const config = {
    LONG: { icon: TrendingUp, color: greenAccent.primary, bg: 'rgba(34, 197, 94, 0.15)' },
    SHORT: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    NEUTRAL: { icon: Minus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  }[direction] || { icon: Minus, color: neonColors.textDim, bg: neonColors.borderDefault };
  
  const Icon = config.icon;
  
  return (
    <div 
      className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl w-fit"
      style={{ background: config.bg, border: `1px solid ${config.color}40` }}
    >
      <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: config.color }} />
      <span className="text-base md:text-lg font-bold" style={{ color: config.color }}>{direction}</span>
    </div>
  );
};

// Price Level Row - Mobile responsive
const PriceLevel: React.FC<{ 
  label: string; 
  price: number; 
  subtext?: string;
  color: string;
  icon?: React.ReactNode;
}> = ({ label, price, subtext, color, icon }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1.5 md:py-2 px-2 md:px-3 rounded-lg gap-0.5 md:gap-0" style={{ background: `${color}10` }}>
    <div className="flex items-center gap-1.5 md:gap-2">
      <div className="hidden md:block">{icon}</div>
      <div className="min-w-0">
        <span className="text-[10px] md:text-xs font-medium block truncate" style={{ color }}>{label}</span>
        {subtext && <p className="text-[9px] md:text-[10px] truncate" style={{ color: neonColors.textDim }}>{subtext}</p>}
      </div>
    </div>
    <span className="font-mono font-bold text-xs md:text-sm" style={{ color: neonColors.textPrimary }}>
      {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  </div>
);

// Detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

// Premium Loading State with phases
const LOADING_PHASES = [
  { message: 'Connecting to market data...', icon: Activity, duration: 800 },
  { message: 'Analyzing price structure...', icon: TrendingUp, duration: 1200 },
  { message: 'Calculating technical indicators...', icon: Target, duration: 1000 },
  { message: 'Processing institutional levels...', icon: Shield, duration: 1000 },
  { message: 'Generating pro-grade insights...', icon: Brain, duration: 1500 },
];

const PremiumLoadingState: React.FC = () => {
  const [currentPhase, setCurrentPhase] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const totalDuration = LOADING_PHASES.reduce((sum, p) => sum + p.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 100, 95));

      // Calculate which phase we're in
      let accumulated = 0;
      for (let i = 0; i < LOADING_PHASES.length; i++) {
        accumulated += LOADING_PHASES[i].duration;
        if (elapsed < accumulated) {
          setCurrentPhase(i);
          break;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = LOADING_PHASES[currentPhase]?.icon || Brain;

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Animated brain with pulse rings */}
      <div className="relative">
        {/* Outer pulse ring */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ 
            border: `2px solid ${greenAccent.primary}`,
            opacity: 0.3,
            margin: '-16px',
            width: 'calc(100% + 32px)',
            height: 'calc(100% + 32px)',
          }}
        />
        {/* Inner pulse ring */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ 
            border: `2px solid ${greenAccent.primary}`,
            opacity: 0.5,
            margin: '-8px',
            width: 'calc(100% + 16px)',
            height: 'calc(100% + 16px)',
            animationDelay: '0.5s',
          }}
        />
        {/* Main icon container */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center animate-brain-think"
          style={{ 
            background: `linear-gradient(135deg, ${greenAccent.primary}20 0%, ${greenAccent.dark}10 100%)`,
            border: `2px solid ${greenAccent.primary}40`,
          }}
        >
          <CurrentIcon 
            className="w-10 h-10 transition-all duration-300" 
            style={{ color: greenAccent.primary }} 
          />
        </div>
      </div>

      {/* Phase message with typing effect */}
      <div className="text-center space-y-2">
        <p 
          className="font-medium text-sm transition-all duration-300" 
          style={{ color: neonColors.textPrimary }}
        >
          {LOADING_PHASES[currentPhase]?.message}
        </p>
        
        {/* Progress bar */}
        <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: neonColors.borderDefault }}>
          <div 
            className="h-full rounded-full transition-all duration-200"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${greenAccent.dark}, ${greenAccent.primary}, ${greenAccent.light})`,
              boxShadow: `0 0 10px ${greenAccent.primary}60`,
            }}
          />
        </div>
        
        <p className="text-xs" style={{ color: neonColors.textDim }}>
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Phase indicators */}
      <div className="flex items-center gap-2">
        {LOADING_PHASES.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background: index <= currentPhase ? greenAccent.primary : neonColors.borderDefault,
              boxShadow: index === currentPhase ? `0 0 8px ${greenAccent.primary}` : 'none',
              transform: index === currentPhase ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ProAnalysisModal: React.FC<ProAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  error,
  displaySymbol,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // Initialize as false (visible) when isOpen is true and analysis exists, otherwise true (hidden)
  const [modalAnimating, setModalAnimating] = useState(!(isOpen && analysis));
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:304',message:'Component rendered',data:{isOpen,hasAnalysis:!!analysis,modalAnimating,isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  }, []);
  // #endregion
  
  // Trigger slide animation only after loading completes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:310',message:'useEffect triggered',data:{isOpen,isLoading,hasAnalysis:!!analysis,currentModalAnimating:modalAnimating},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.log('[ProAnalysisModal] useEffect triggered - isOpen:', isOpen, 'isLoading:', isLoading, 'hasAnalysis:', !!analysis, 'current modalAnimating:', modalAnimating);
    if (isOpen && analysis) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:313',message:'Setting modalAnimating to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      // If we have analysis data, show immediately regardless of isLoading
      // (isLoading might be true due to other state, but we have the saved analysis)
      console.log('[ProAnalysisModal] Analysis available, showing modal immediately - setting modalAnimating to false');
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setModalAnimating(false);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:318',message:'modalAnimating set to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        console.log('[ProAnalysisModal] modalAnimating set to false via requestAnimationFrame');
      });
    } else if (isOpen && isLoading && !analysis) {
      // Keep hidden during loading when no analysis yet
      console.log('[ProAnalysisModal] Modal is loading and no analysis, keeping hidden');
      setModalAnimating(true);
    } else if (isOpen && !isLoading && !analysis) {
      // No analysis and not loading - show anyway (might be error state)
      console.warn('[ProAnalysisModal] Modal is open but no analysis provided, showing anyway');
      requestAnimationFrame(() => {
        setModalAnimating(false);
      });
    } else if (!isOpen) {
      // Modal is closed
      setModalAnimating(true);
    }
  }, [isOpen, isLoading, analysis]);
  
  // Close modal with animation
  const handleClose = () => {
    setModalAnimating(true);
    setTimeout(() => {
      onClose();
      setModalAnimating(false);
      setDragY(0);
    }, 400);
  };
  
  // Handle drag start
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };
  
  // Handle drag move
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    if (isDragging) {
      if (dragY > 100) {
        // Swipe down to close
        handleClose();
      } else {
        // Snap back
        setDragY(0);
      }
      setIsDragging(false);
    }
  };
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Log when modal should render
  useEffect(() => {
    if (isOpen) {
      console.log('[ProAnalysisModal] Modal isOpen=true, rendering modal', {
        hasAnalysis: !!analysis,
        isLoading,
        modalAnimating,
        analysisKeys: analysis ? Object.keys(analysis) : [],
      });
    }
  }, [isOpen, analysis, isLoading, modalAnimating]);
  
  // Force modal to show when opened from history (even if parent is hidden)
  useEffect(() => {
    if (isOpen && analysis && modalAnimating) {
      console.log('[ProAnalysisModal] Force showing modal - analysis available but modalAnimating is true');
      // Small delay to ensure portal is rendered
      const timer = setTimeout(() => {
        setModalAnimating(false);
        console.log('[ProAnalysisModal] Forced modalAnimating to false');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, analysis, modalAnimating]);
  
  if (!isOpen) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:418',message:'Modal not open - returning null',data:{isOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProAnalysisModal.tsx:420',message:'Rendering modal JSX',data:{isOpen,hasAnalysis:!!analysis,modalAnimating,transform:modalAnimating?'translateY(100%)':'translateY(0)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  console.log('[ProAnalysisModal] Rendering modal component - isOpen:', isOpen, 'hasAnalysis:', !!analysis);
  
  return (
    <>
      {/* Backdrop - Same as Calcu XX */}
      <div 
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 ${modalAnimating ? 'opacity-0' : 'opacity-100'}`}
        style={{ zIndex: 99998 }}
        onClick={handleClose}
      />
      
      {/* Modal - Slides from bottom, positioned below header (same as Calcu XX) */}
      <div 
        ref={modalRef}
        className={`fixed inset-x-0 bottom-0 overflow-hidden flex flex-col rounded-t-3xl border-t shadow-2xl ${
          isDragging ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
        style={{
          zIndex: 99999, // Highest z-index to be on top of everything
          top: isMobile ? '72px' : '80px',
          height: isMobile 
            ? `calc(100% - 72px - env(safe-area-inset-bottom, 0px))`
            : `calc(100% - 80px)`,
          maxHeight: isMobile 
            ? `calc(100% - 72px - env(safe-area-inset-bottom, 0px))`
            : `calc(100% - 80px)`,
          // Glassmorphism effect (same as navigation bar)
          background: 'rgba(15, 15, 20, 0.3)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.3)',
          // Transform: prioritize dragY, then modalAnimating state
          transform: dragY > 0 
            ? `translateY(${dragY}px)` 
            : (modalAnimating ? 'translateY(100%)' : 'translateY(0)'),
        }}
      >
        {/* Drag Handle - Swipe down to close (same as Calcu XX) */}
        <div 
          className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className={`w-12 h-1.5 rounded-full transition-colors ${isDragging ? 'bg-slate-400' : 'bg-slate-600'}`} />
          </div>
        
        {/* Header - Single line layout with clear background */}
        <div 
          className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0"
          style={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'transparent',
          }}
        >
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div 
              className="p-1.5 md:p-2 rounded-xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${greenAccent.primary} 0%, ${greenAccent.dark} 100%)` }}
            >
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-black" />
            </div>
            <h2 className="text-base md:text-lg font-bold flex-shrink-0" style={{ color: neonColors.textPrimary }}>
                Pro Analysis
              </h2>
              {analysis && (
              <p className="text-[10px] md:text-xs ml-auto flex-shrink-0" style={{ color: neonColors.textDim }}>
                  {displaySymbol ?? analysis.symbol} • {analysis.timeframe} • {new Date(analysis.analyzedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
        </div>
        
        {/* Content - Scrollable; flex-1 min-h-0 so it shrinks and scrolls inside the modal */}
        <div 
          className={`flex-1 min-h-0 overflow-y-auto p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}
          style={{ 
            paddingBottom: isMobile ? 'max(96px, calc(24px + env(safe-area-inset-bottom)))' : undefined,
          }}
        >
          {isLoading ? (
            <PremiumLoadingState />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="w-16 h-16" style={{ color: '#ef4444' }} />
              <p className="text-center" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4 md:space-y-6">
              {/* Top Row: Direction + Conviction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {/* Direction & Executive Summary */}
                <div className="space-y-3 md:space-y-4">
                  <DirectionBadge direction={analysis.tradeSetup.direction} />
                  <div 
                    className="p-3 md:p-4 rounded-xl"
                    style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: greenAccent.primary }} />
                      <span className="text-[10px] md:text-xs font-semibold" style={{ color: greenAccent.primary }}>Executive Summary</span>
                    </div>
                    <p className="text-xs md:text-sm" style={{ color: neonColors.textSecondary }}>{analysis.executiveSummary}</p>
                  </div>
                  <div 
                    className="p-3 md:p-4 rounded-xl"
                    style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                  >
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#a855f7' }} />
                      <span className="text-[10px] md:text-xs font-semibold" style={{ color: '#a855f7' }}>Alpha Lead</span>
                    </div>
                    <p className="text-xs md:text-sm" style={{ color: neonColors.textSecondary }}>{analysis.alphaLead}</p>
                  </div>
                </div>
                
                {/* Conviction Gauge */}
                <div 
                  className="p-3 md:p-4 rounded-xl flex flex-col items-center"
                  style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}
                >
                  <ConvictionGauge 
                    grade={analysis.tradeSetup.convictionGrade} 
                    breakdown={analysis.tradeSetup.convictionBreakdown}
                    isMobile={isMobile}
                  />
                </div>
              </div>
              
              {/* Trade Setup */}
              <div 
                className="p-3 md:p-4 rounded-xl"
                style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}
              >
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Target className="w-4 h-4" style={{ color: greenAccent.primary }} />
                  <span className="text-xs md:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>Trade Setup</span>
                  <span 
                    className="ml-auto text-[10px] md:text-xs px-2 py-0.5 rounded"
                    style={{ background: `${greenAccent.primary}20`, color: greenAccent.primary }}
                  >
                    R:R {analysis.riskManagement.riskRewardRatio}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-3">
                  {/* Entry Zone */}
                  <PriceLevel 
                    label="Entry Zone"
                    price={analysis.tradeSetup.executionZone.min}
                    subtext={`to ${analysis.tradeSetup.executionZone.max.toFixed(2)}`}
                    color={greenAccent.primary}
                    icon={<ArrowUpRight className="w-4 h-4" style={{ color: greenAccent.primary }} />}
                  />
                  
                  {/* Stop Loss */}
                  <PriceLevel 
                    label="Stop Loss"
                    price={analysis.tradeSetup.stopLoss.price}
                    subtext={analysis.tradeSetup.stopLoss.reasoning}
                    color="#ef4444"
                    icon={<Shield className="w-4 h-4" style={{ color: '#ef4444' }} />}
                  />
                  
                  {/* Take Profits */}
                  <PriceLevel 
                    label={`TP1 - ${analysis.tradeSetup.targets.tp1.label}`}
                    price={analysis.tradeSetup.targets.tp1.price}
                    subtext={analysis.tradeSetup.targets.tp1.rr}
                    color={greenAccent.primary}
                    icon={<ChevronUp className="w-4 h-4" style={{ color: greenAccent.primary }} />}
                  />
                  <PriceLevel 
                    label={`TP2 - ${analysis.tradeSetup.targets.tp2.label}`}
                    price={analysis.tradeSetup.targets.tp2.price}
                    subtext={analysis.tradeSetup.targets.tp2.rr}
                    color={greenAccent.light}
                    icon={<ChevronUp className="w-4 h-4" style={{ color: greenAccent.light }} />}
                  />
                  <PriceLevel 
                    label={`TP3 - ${analysis.tradeSetup.targets.tp3.label}`}
                    price={analysis.tradeSetup.targets.tp3.price}
                    subtext={analysis.tradeSetup.targets.tp3.rr}
                    color="#06b6d4"
                    icon={<ChevronUp className="w-4 h-4" style={{ color: '#06b6d4' }} />}
                  />
                  
                  {/* Invalidation */}
                  <PriceLevel 
                    label="Invalidation"
                    price={analysis.tradeSetup.invalidation.price}
                    subtext={analysis.tradeSetup.invalidation.consequence}
                    color="#f59e0b"
                    icon={<AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />}
                  />
                </div>
              </div>
              
              {/* Market Structure & Patterns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Market Structure */}
                <div 
                  className="p-3 md:p-4 rounded-xl"
                  style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}
                >
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: greenAccent.primary }} />
                    <span className="text-xs md:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>Market Structure</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] md:text-xs" style={{ color: neonColors.textDim }}>Phase</span>
                      <span className="text-[10px] md:text-xs font-medium uppercase" style={{ color: greenAccent.primary }}>
                        {analysis.marketStructure.phase}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] md:text-xs" style={{ color: neonColors.textDim }}>Character</span>
                      <span className="text-[10px] md:text-xs font-medium" style={{ color: '#a855f7' }}>
                        {analysis.marketStructure.character}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs mt-1.5 md:mt-2" style={{ color: neonColors.textSecondary }}>
                      {analysis.marketStructure.description}
                    </p>
                  </div>
                </div>
                
                {/* Correlation Alert */}
                <div 
                  className="p-3 md:p-4 rounded-xl"
                  style={{ background: neonColors.bgCard, border: `1px solid ${neonColors.borderDefault}` }}
                >
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#06b6d4' }} />
                    <span className="text-xs md:text-sm font-semibold" style={{ color: neonColors.textPrimary }}>Correlation</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] md:text-xs" style={{ color: neonColors.textDim }}>{analysis.correlationAlert.asset}</span>
                      <span 
                        className="text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded"
                        style={{ 
                          background: analysis.correlationAlert.status === 'CONFIRMING' ? `${greenAccent.primary}20` : 
                                     analysis.correlationAlert.status === 'DIVERGING' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: analysis.correlationAlert.status === 'CONFIRMING' ? greenAccent.primary : 
                                 analysis.correlationAlert.status === 'DIVERGING' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {analysis.correlationAlert.status}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs" style={{ color: neonColors.textSecondary }}>
                      {analysis.correlationAlert.implication}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Devil's Advocate */}
              <div 
                className="p-3 md:p-4 rounded-xl"
                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
              >
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#ef4444' }} />
                  <span className="text-xs md:text-sm font-semibold" style={{ color: '#ef4444' }}>Devil's Advocate</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                  <span className="text-[10px] md:text-xs" style={{ color: neonColors.textDim }}>Trigger:</span>
                  <span className="font-mono font-bold text-sm md:text-base" style={{ color: '#ef4444' }}>
                    {analysis.alternativeScenario.triggerPrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {analysis.alternativeScenario.biasShift}
                  </span>
                </div>
                <p className="text-[10px] md:text-xs" style={{ color: neonColors.textSecondary }}>
                  {analysis.alternativeScenario.description}
                </p>
              </div>
              
              {/* Pro Tip & Educational Note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div 
                  className="p-3 md:p-4 rounded-xl"
                  style={{ background: `${greenAccent.primary}10`, border: `1px solid ${greenAccent.primary}30` }}
                >
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: greenAccent.primary }} />
                    <span className="text-[10px] md:text-xs font-semibold" style={{ color: greenAccent.primary }}>Pro Tip</span>
                  </div>
                  <p className="text-[10px] md:text-xs" style={{ color: neonColors.textSecondary }}>{analysis.proTip}</p>
                </div>
                <div 
                  className="p-3 md:p-4 rounded-xl"
                  style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#06b6d4' }} />
                    <span className="text-[10px] md:text-xs font-semibold" style={{ color: '#06b6d4' }}>Educational Note</span>
                  </div>
                  <p className="text-[10px] md:text-xs" style={{ color: neonColors.textSecondary }}>{analysis.educationalNote}</p>
                </div>
              </div>
              
              {/* Disclaimer */}
              <p className="text-center text-[9px] md:text-[10px] py-2 md:py-3" style={{ color: neonColors.textDim }}>
                Educational purposes only. Always DYOR and manage risk appropriately.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default ProAnalysisModal;
