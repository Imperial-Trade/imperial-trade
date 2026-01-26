import React, { useState } from 'react';
import { neonColors } from './neonTheme';

interface TimeframeSelectorProps {
  selectedTimeframe: string;
  onSelect: (timeframe: string) => void;
  size?: 'sm' | 'md' | 'lg';
  /** 'insight' = Robinhood-style dark green gradient; default = bright emerald */
  variant?: 'default' | 'insight';
  /** Show trading style buttons instead of timeframes */
  showTradingTypes?: boolean;
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

const TRADING_STYLES = [
  { 
    value: 'scalping', 
    label: 'Scalping', 
    timeframe: '1M - 5M',
    timeframes: ['1m', '5m'],
    defaultTimeframe: '1m'
  },
  { 
    value: 'intraday', 
    label: 'Intraday', 
    timeframe: '15M - 1H',
    timeframes: ['15m', '1h'],
    defaultTimeframe: '15m'
  },
  { 
    value: 'swing', 
    label: 'Swing Trade', 
    timeframe: '4H - 1D',
    timeframes: ['4h', '1d'],
    defaultTimeframe: '4h'
  },
  { 
    value: 'position', 
    label: 'Position', 
    timeframe: '1D - 1W',
    timeframes: ['1d', '1w'],
    defaultTimeframe: '1w'
  },
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
}) => {
  const [hoveredTf, setHoveredTf] = useState<string | null>(null);
  const isInsight = variant === 'insight';

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

  // Determine which trading style is selected based on timeframe
  const getSelectedTradingStyle = () => {
    if (!showTradingTypes) return null;
    return TRADING_STYLES.find(style => 
      style.timeframes.includes(selectedTimeframe)
    ) || TRADING_STYLES[1]; // Default to intraday
  };

  // If showing trading types, render 2x2 grid
  if (showTradingTypes) {
    const selectedStyle = getSelectedTradingStyle();
    
    return (
      <div 
        className="grid grid-cols-2 gap-2" 
        style={{ 
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: 9999,
          isolation: 'isolate',
        }}
      >
        {TRADING_STYLES.map((style) => {
          const isSelected = selectedStyle?.value === style.value;
          const isHovered = hoveredTf === style.value && !isSelected;
          
          // Use teal colors for insight variant (matching the image)
          const selectedTeal = isInsight ? insightColors.teal : '#0d9488';
          const selectedTealLight = isInsight ? `${insightColors.teal}20` : '#0d948820';
          const selectedTealBorder = isInsight ? insightColors.emerald : '#047857';
          
          const handleClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`[TimeframeSelector] Clicked ${style.label} (${style.value}), setting timeframe to ${style.defaultTimeframe}`);
            // Select the default timeframe for this trading style
            onSelect(style.defaultTimeframe);
          };

          return (
            <button
              key={style.value}
              type="button"
              data-trading-style={style.value}
              onClick={handleClick}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[TimeframeSelector] MouseDown on ${style.label}`);
                handleClick(e as any);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[TimeframeSelector] TouchEnd on ${style.label}`);
                handleClick(e as any);
              }}
              onMouseEnter={() => {
                console.log(`[TimeframeSelector] Hovering ${style.label}`);
                setHoveredTf(style.value);
              }}
              onMouseLeave={() => setHoveredTf(null)}
              className="relative rounded-xl p-3 md:p-4 transition-all duration-200 text-left cursor-pointer select-none"
              style={{
                background: isSelected 
                  ? selectedTealLight
                  : isHovered 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(255, 255, 255, 0.02)',
                border: isSelected 
                  ? `1.5px solid ${selectedTealBorder}`
                  : 'none',
                color: isSelected 
                  ? selectedTeal
                  : isHovered 
                    ? '#fff' 
                    : 'rgba(163, 163, 163, 0.8)',
                boxShadow: isSelected ? `0 2px 8px ${selectedTeal}30` : '0 1px 3px rgba(0,0,0,0.1)',
                transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                pointerEvents: 'auto',
                zIndex: 9999,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                isolation: 'isolate',
              }}
            >
              <div className="font-semibold text-sm md:text-base mb-1 pointer-events-none">
                {style.label}
              </div>
              <div className="text-[10px] md:text-xs opacity-70 pointer-events-none">
                {style.timeframe}
              </div>
              {isSelected && (
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
                  style={{ 
                    background: selectedTeal,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Show timeframes
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(tf.value);
            }}
            onMouseEnter={() => setHoveredTf(tf.value)}
            onMouseLeave={() => setHoveredTf(null)}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className={`relative rounded-lg font-bold transition-all duration-200 shrink-0 cursor-pointer ${sizeStyles[size]}`}
            style={{
              background: isSelected ? selectedBg : isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: isSelected ? selectedColor : isHovered ? '#fff' : 'rgba(163, 163, 163, 0.6)',
              boxShadow: isSelected ? selectedShadow : 'none',
              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
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
