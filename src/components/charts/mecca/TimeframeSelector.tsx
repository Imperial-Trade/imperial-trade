import React from 'react';
import { neonColors } from './neonTheme';

interface TimeframeSelectorProps {
  selectedTimeframe: string;
  onSelect: (timeframe: string) => void;
}

const TIMEFRAMES = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selectedTimeframe, onSelect }) => {
  return (
    <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto scrollbar-hide">
      {TIMEFRAMES.map((tf) => {
        const isSelected = selectedTimeframe === tf.value;
        return (
          <button
            key={tf.value}
            onClick={() => onSelect(tf.value)}
            className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all duration-200 shrink-0"
            style={{
              background: isSelected
                ? `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`
                : 'transparent',
              color: isSelected ? '#000' : neonColors.textMuted,
              border: isSelected ? 'none' : `1px solid ${neonColors.borderDefault}`,
              boxShadow: isSelected ? `0 0 15px ${neonColors.neonGreenGlow}` : 'none',
            }}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeframeSelector;
