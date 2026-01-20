import React, { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { neonColors, getPriceChangeColor, assetIcons } from './neonTheme';

interface TickerItemProps {
  symbol: string;
  name: string;
  onSelect?: (symbol: string) => void;
  isSelected?: boolean;
}

const TickerItem: React.FC<TickerItemProps> = ({ symbol, name, onSelect, isSelected }) => {
  const { livePrice, change, changePercent } = useOptimizedLivePrice(symbol, { debounceMs: 100 });
  const prevPriceRef = useRef(livePrice);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (livePrice && livePrice !== prevPriceRef.current && flashRef.current) {
      flashRef.current.style.animation = 'none';
      void flashRef.current.offsetHeight; // Trigger reflow
      flashRef.current.style.animation = 'priceFlash 0.5s ease';
      prevPriceRef.current = livePrice;
    }
  }, [livePrice]);

  const priceColor = getPriceChangeColor(change || 0);
  const icon = assetIcons[symbol] || '📊';

  const formatPrice = (price: number | null) => {
    if (!price) return '---';
    if (price > 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(price < 10 ? 4 : 2);
  };

  return (
    <div
      ref={flashRef}
      onClick={() => onSelect?.(symbol)}
      className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-all duration-200 shrink-0"
      style={{
        background: isSelected ? neonColors.neonGreenSubtle : 'transparent',
        borderRadius: '8px',
        border: isSelected ? `1px solid ${neonColors.borderActive}` : '1px solid transparent',
      }}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-bold" style={{ color: neonColors.textPrimary }}>
          {symbol}
        </span>
        <span className="text-[10px]" style={{ color: neonColors.textDim }}>
          {name}
        </span>
      </div>
      <div className="flex flex-col items-end ml-2">
        <span className="text-sm font-mono font-bold" style={{ color: neonColors.textPrimary }}>
          {formatPrice(livePrice)}
        </span>
        <div className="flex items-center gap-1">
          {(change || 0) >= 0 ? (
            <TrendingUp className="w-3 h-3" style={{ color: priceColor.color }} />
          ) : (
            <TrendingDown className="w-3 h-3" style={{ color: priceColor.color }} />
          )}
          <span className="text-[10px] font-mono" style={{ color: priceColor.color }}>
            {(changePercent || 0) >= 0 ? '+' : ''}{(changePercent || 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface MarketTickerBarProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold' },
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'U30USD', name: 'Dow Jones' },
  { symbol: 'SPXUSD', name: 'S&P 500' },
  { symbol: 'NDXUSD', name: 'Nasdaq' },
];

const MarketTickerBar: React.FC<MarketTickerBarProps> = ({ selectedSymbol, onSelectSymbol }) => {
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(13, 18, 16, 0.9) 0%, rgba(8, 12, 10, 0.85) 100%)',
        borderBottom: `1px solid ${neonColors.borderDefault}`,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 shrink-0 mr-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: neonColors.neonGreen }}
          />
          <span className="text-xs font-medium" style={{ color: neonColors.textMuted }}>
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
