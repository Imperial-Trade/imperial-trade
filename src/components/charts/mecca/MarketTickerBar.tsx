import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { neonColors, assetIcons } from './neonTheme';

// Premium color configuration
const premiumColors = {
  emerald: '#22c55e',
  emeraldSubtle: 'rgba(34, 197, 94, 0.1)',
  emeraldGlow: 'rgba(34, 197, 94, 0.3)',
  red: '#ef4444',
  redSubtle: 'rgba(239, 68, 68, 0.1)',
  redGlow: 'rgba(239, 68, 68, 0.3)',
};

// Animated price display: smooth value transition + color flash on change
const AnimatedPrice: React.FC<{ 
  value: number | null; 
  className?: string;
  decimals?: number;
}> = ({ value, className = '', decimals = 2 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && value != null) {
      setIsAnimating(true);
      const startValue = prevValue.current ?? 0;
      const endValue = value;
      const startTime = Date.now();
      const duration = 300;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * eased;
        setDisplayValue(current);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValue.current = value;
        }
      };
      requestAnimationFrame(animate);
    } else if (value != null) {
      setDisplayValue(value);
      prevValue.current = value;
    }
  }, [value]);

  const formatPrice = (p: number | null) => {
    if (p == null) return '---';
    if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return p.toFixed(p < 10 ? 4 : decimals);
  };

  const isUp = (value ?? 0) > (prevValue.current ?? 0);
  const priceString = formatPrice(displayValue);

  return (
    <span
      className={`font-mono tabular-nums ${className}`}
      style={{
        color: isAnimating ? (isUp ? premiumColors.emerald : premiumColors.red) : undefined,
        textShadow: isAnimating ? `0 0 8px ${isUp ? premiumColors.emeraldGlow : premiumColors.redGlow}` : 'none',
        transition: 'color 0.2s, text-shadow 0.2s',
      }}
    >
      {priceString}
    </span>
  );
};

interface TickerItemProps {
  symbol: string;
  name: string;
  onSelect?: (symbol: string) => void;
  isSelected?: boolean;
  compact?: boolean;
}

const TickerItem: React.FC<TickerItemProps> = ({ symbol, name, onSelect, isSelected, compact }) => {
  const { livePrice, change, changePercent } = useOptimizedLivePrice(symbol, { debounceMs: 100 });
  const prevPriceRef = useRef(livePrice);
  const flashRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Determine if price went up or down
  const isPositiveChange = (change || 0) > 0.0001;
  const isNegativeChange = (change || 0) < -0.0001;
  const changeDirection = isPositiveChange ? 'up' : isNegativeChange ? 'down' : 'neutral';

  useEffect(() => {
    if (livePrice && livePrice !== prevPriceRef.current && flashRef.current) {
      const wentUp = prevPriceRef.current ? livePrice > prevPriceRef.current : isPositiveChange;
      const flashColor = wentUp ? premiumColors.emeraldGlow : premiumColors.redGlow;
      
      flashRef.current.style.backgroundColor = flashColor;
      flashRef.current.style.boxShadow = `0 0 15px ${flashColor}`;
      
      setTimeout(() => {
        if (flashRef.current) {
          flashRef.current.style.backgroundColor = 'transparent';
          flashRef.current.style.boxShadow = 'none';
        }
      }, 400);
      
      prevPriceRef.current = livePrice;
    }
  }, [livePrice, isPositiveChange]);

  const icon = assetIcons[symbol] || '📊';

  const formatChangePercent = (percent: number | null) => {
    const val = percent || 0;
    if (Math.abs(val) < 0.005) return '+0.00%';
    return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
  };

  const getChangeColor = () => {
    if (changeDirection === 'up') return premiumColors.emerald;
    if (changeDirection === 'down') return premiumColors.red;
    return neonColors.textMuted;
  };

  // Compact mode for inline desktop display
  if (compact) {
    return (
      <div
        ref={flashRef}
        onClick={() => onSelect?.(symbol)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer shrink-0 rounded-lg transition-all duration-200"
        style={{
          background: isSelected 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(234, 179, 8, 0.08) 100%)'
            : isHovered 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'transparent',
          border: isSelected 
            ? '1px solid rgba(34, 197, 94, 0.3)' 
            : '1px solid transparent',
          boxShadow: isSelected ? '0 0 15px rgba(34, 197, 94, 0.15)' : 'none',
        }}
      >
        <span className="text-sm">{icon}</span>
        <span 
          className="text-[10px] font-bold tracking-wide"
          style={{ color: isSelected ? premiumColors.emerald : neonColors.textPrimary }}
        >
          {symbol}
        </span>
        <AnimatedPrice 
          value={livePrice} 
          className="text-xs font-bold" 
          decimals={symbol === 'BTCUSD' ? 2 : 2}
        />
        <div className="flex items-center gap-0.5">
          {changeDirection !== 'neutral' && (
            changeDirection === 'up' 
              ? <TrendingUp className="w-2.5 h-2.5" style={{ color: premiumColors.emerald }} />
              : <TrendingDown className="w-2.5 h-2.5" style={{ color: premiumColors.red }} />
          )}
          <span 
            className="text-[9px] font-mono font-medium"
            style={{ color: getChangeColor() }}
          >
            {formatChangePercent(changePercent)}
          </span>
        </div>
      </div>
    );
  }

  // Full mode with more details
  return (
    <div
      ref={flashRef}
      onClick={() => onSelect?.(symbol)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer shrink-0 rounded-xl transition-all duration-200"
      style={{
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(234, 179, 8, 0.06) 100%)'
          : isHovered 
            ? 'rgba(255, 255, 255, 0.03)' 
            : 'transparent',
        border: isSelected 
          ? '1px solid rgba(34, 197, 94, 0.25)' 
          : '1px solid transparent',
        boxShadow: isSelected ? '0 0 20px rgba(34, 197, 94, 0.12)' : 'none',
      }}
    >
      <div 
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200"
        style={{ 
          background: isSelected 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)'
            : 'rgba(255, 255, 255, 0.05)',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex flex-col">
        <span 
          className="text-xs font-bold tracking-wide"
          style={{ color: isSelected ? premiumColors.emerald : neonColors.textPrimary }}
        >
          {symbol}
        </span>
        <span className="text-[10px]" style={{ color: neonColors.textDim }}>
          {name}
        </span>
      </div>
      <div className="flex flex-col items-end ml-2">
        <AnimatedPrice 
          value={livePrice} 
          className="text-sm font-bold"
        />
        <div className="flex items-center gap-1 mt-0.5">
          {changeDirection === 'up' ? (
            <TrendingUp className="w-3 h-3" style={{ color: premiumColors.emerald }} />
          ) : changeDirection === 'down' ? (
            <TrendingDown className="w-3 h-3" style={{ color: premiumColors.red }} />
          ) : null}
          <span 
            className="text-[10px] font-mono font-medium"
            style={{ color: getChangeColor() }}
          >
            {formatChangePercent(changePercent)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface MarketTickerBarProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  compact?: boolean;
}

const ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold' },
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'U30USD', name: 'Dow Jones' },
  { symbol: 'SPXUSD', name: 'S&P 500' },
  { symbol: 'NDXUSD', name: 'Nasdaq' },
];

const MarketTickerBar: React.FC<MarketTickerBarProps> = ({ selectedSymbol, onSelectSymbol, compact }) => {
  // Compact mode for inline desktop display
  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-touch">
        {ASSETS.map((asset) => (
          <TickerItem
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            onSelect={onSelectSymbol}
            isSelected={selectedSymbol === asset.symbol}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-hidden rounded-xl"
      style={{
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide scroll-touch">
        {/* Live indicator with premium animation */}
        <div className="flex items-center gap-1.5 shrink-0 mr-2 px-2 py-1 rounded-md" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: premiumColors.emerald }}
            />
            <div
              className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
              style={{ background: premiumColors.emerald, opacity: 0.5 }}
            />
          </div>
          <span 
            className="text-[10px] font-bold tracking-wider"
            style={{ color: premiumColors.emerald }}
          >
            LIVE
          </span>
        </div>
        
        {ASSETS.map((asset) => (
          <TickerItem
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            onSelect={onSelectSymbol}
            isSelected={selectedSymbol === asset.symbol}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketTickerBar;
