import React, { useState } from 'react';
import { neonColors } from './neonTheme';

interface TimeframeSelectorProps {
  selectedTimeframe: string;
  onSelect: (timeframe: string) => void;
  size?: 'sm' | 'md' | 'lg';
  /** 'insight' = Robinhood-style dark green gradient; default = bright emerald */
  variant?: 'default' | 'insight';
  /** When true, show trading style buttons (Scalping, Intraday, Swing, Position) in 2x2 grid */
  showTradingTypes?: boolean;
  /** Trading styles data - passed from parent */
  tradingStyles?: Array<{ value: string; label: string; timeframes: string[] }>;
  /** Selected trading style */
  selectedTradingStyle?: string;
  /** Callback when trading style changes */
  onTradingStyleSelect?: (style: string) => void;
}

const TIMEFRAMES = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

// Default: bright emerald
const premiumColors = {
  emerald: '#22c55e',
  emeraldDark: '#16a34a',
  gold: '#eab308',
};

// Insight/Robinhood: dark teal–emerald gradient
const insightColors = {
  teal: '#0d9488',
  emerald: '#047857',
  dark: '#065f46',
};

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ 
  selectedTimeframe, 
  onSelect,
  size = 'md',
  variant = 'default',
  showTradingTypes = false,
  tradingStyles = [],
  selectedTradingStyle,
  onTradingStyleSelect,
}) => {
  const [hoveredTf, setHoveredTf] = useState<string | null>(null);
  const isInsight = variant === 'insight';

  // If showing trading types, render 2x2 grid
  if (showTradingTypes && tradingStyles.length > 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TimeframeSelector.tsx:58',message:'Rendering trade types grid',data:{showTradingTypes,tradingStylesLength:tradingStyles.length,selectedTradingStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime-check',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return (
      <div className="grid grid-cols-2 gap-2">
        {tradingStyles.map((style) => {
          const isSelected = selectedTradingStyle === style.value;
          return (
            <button
              key={style.value}
              onClick={() => {
                onTradingStyleSelect?.(style.value);
                // Auto-select first timeframe for this style
                if (style.timeframes[0]) {
                  onSelect(style.timeframes[0]);
                }
              }}
              className="relative flex flex-col items-center justify-center py-3 px-4 rounded-2xl transition-all duration-300"
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.18) 0%, rgba(4, 120, 87, 0.14) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '2px solid rgba(13, 148, 136, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSelected ? '0 0 20px rgba(13, 148, 136, 0.25)' : '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <span className="text-sm font-bold" style={{ color: isSelected ? 'rgba(167, 243, 208, 0.95)' : 'rgba(163, 163, 163, 0.8)' }}>
                {style.label}
              </span>
              <span className="text-xs mt-1" style={{ color: 'rgba(163, 163, 163, 0.6)' }}>
                {style.timeframes.map(tf => {
                  const tfMap: Record<string, string> = { '1m': '1M', '5m': '5M', '15m': '15M', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W' };
                  return tfMap[tf] || tf;
                }).join(' - ')}
              </span>
              {isSelected && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400" style={{ opacity: 0.8 }} />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const sizeStyles = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs',
    lg: 'px-3 md:px-4 py-2 text-xs md:text-sm',
  };

  const selectedBg = isInsight
    ? `linear-gradient(135deg, ${insightColors.teal} 0%, ${insightColors.emerald} 50%, ${insightColors.dark} 100%)`
    : `linear-gradient(135deg, ${premiumColors.emerald} 0%, ${premiumColors.emeraldDark} 100%)`;
  const selectedColor = isInsight ? '#fff' : '#000';
  const selectedShadow = isInsight
    ? `0 0 12px ${insightColors.teal}50`
    : `0 0 15px ${premiumColors.emerald}40`;

  return (
    <div 
      className="flex items-center gap-0.5 md:gap-1 p-1 rounded-xl overflow-x-auto scrollbar-hide scroll-touch"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {TIMEFRAMES.map((tf) => {
        const isSelected = selectedTimeframe === tf.value;
        const isHovered = hoveredTf === tf.value && !isSelected;
        
        return (
          <button
            key={tf.value}
            onClick={() => onSelect(tf.value)}
            onMouseEnter={() => setHoveredTf(tf.value)}
            onMouseLeave={() => setHoveredTf(null)}
            className={`relative rounded-lg font-bold transition-all duration-200 shrink-0 ${sizeStyles[size]}`}
            style={{
              background: isSelected ? selectedBg : isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: isSelected ? selectedColor : isHovered ? '#fff' : 'rgba(163, 163, 163, 0.6)',
              boxShadow: isSelected ? selectedShadow : 'none',
              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {tf.label}
            {isSelected && (
              <div 
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: isInsight ? 'rgba(255,255,255,0.4)' : '#000', opacity: 0.3 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TimeframeSelector;
