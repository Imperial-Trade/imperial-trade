import React, { useState } from 'react';
import { neonColors } from './neonTheme';

interface TimeframeSelectorProps {
  selectedTimeframe: string;
  onSelect: (timeframe: string) => void;
  size?: 'sm' | 'md' | 'lg';
  /** 'insight' = Robinhood-style dark green gradient; default = bright emerald */
  variant?: 'default' | 'insight';
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
