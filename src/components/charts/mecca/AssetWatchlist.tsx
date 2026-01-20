import React, { useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { neonColors, neonCardStyle, getPriceChangeColor, assetIcons } from './neonTheme';

interface AssetRowProps {
  symbol: string;
  name: string;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ symbol, name, isSelected, onSelect }) => {
  const { livePrice, change, changePercent } = useOptimizedLivePrice(symbol, { debounceMs: 100 });
  const prevPriceRef = useRef(livePrice);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (livePrice && livePrice !== prevPriceRef.current && rowRef.current) {
      const direction = livePrice > (prevPriceRef.current || 0) ? 'up' : 'down';
      rowRef.current.style.background = direction === 'up' 
        ? 'rgba(34, 197, 94, 0.15)' 
        : 'rgba(239, 68, 68, 0.15)';
      setTimeout(() => {
        if (rowRef.current) {
          rowRef.current.style.background = isSelected 
            ? neonColors.neonGreenSubtle 
            : 'transparent';
        }
      }, 300);
      prevPriceRef.current = livePrice;
    }
  }, [livePrice, isSelected]);

  const priceColor = getPriceChangeColor(change || 0);
  const icon = assetIcons[symbol] || '📊';

  const formatPrice = (price: number | null) => {
    if (!price) return '---';
    if (price > 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(price < 10 ? 4 : 2);
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onSelect(symbol)}
      className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 rounded-xl group"
      style={{
        background: isSelected ? neonColors.neonGreenSubtle : 'transparent',
        border: isSelected 
          ? `1px solid ${neonColors.borderActive}` 
          : '1px solid transparent',
        boxShadow: isSelected ? `0 0 15px ${neonColors.neonGreenGlow}` : 'none',
      }}
    >
      {/* Asset Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{
          background: isSelected 
            ? `linear-gradient(135deg, ${neonColors.neonGreen}20 0%, ${neonColors.neonGreenDark}20 100%)`
            : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isSelected ? neonColors.borderActive : neonColors.borderDefault}`,
        }}
      >
        {icon}
      </div>

      {/* Asset Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span 
            className="font-bold text-sm"
            style={{ color: isSelected ? neonColors.neonGreenLight : neonColors.textPrimary }}
          >
            {symbol}
          </span>
          {isSelected && (
            <Star className="w-3 h-3 fill-current" style={{ color: neonColors.neonGreen }} />
          )}
        </div>
        <span className="text-xs" style={{ color: neonColors.textDim }}>
          {name}
        </span>
      </div>

      {/* Price & Change */}
      <div className="flex flex-col items-end">
        <span
          className="font-mono font-bold text-sm"
          style={{ color: neonColors.textPrimary }}
        >
          {formatPrice(livePrice)}
        </span>
        <div className="flex items-center gap-1">
          {(change || 0) >= 0 ? (
            <TrendingUp className="w-3 h-3" style={{ color: priceColor.color }} />
          ) : (
            <TrendingDown className="w-3 h-3" style={{ color: priceColor.color }} />
          )}
          <span
            className="text-xs font-mono"
            style={{ color: priceColor.color }}
          >
            {(changePercent || 0) >= 0 ? '+' : ''}{(changePercent || 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface AssetWatchlistProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold Spot' },
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'U30USD', name: 'Dow Jones 30' },
  { symbol: 'SPXUSD', name: 'S&P 500' },
  { symbol: 'NDXUSD', name: 'Nasdaq 100' },
];

const AssetWatchlist: React.FC<AssetWatchlistProps> = ({ selectedSymbol, onSelectSymbol }) => {
  return (
    <div
      className="h-full flex flex-col rounded-2xl overflow-hidden"
      style={neonCardStyle}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${neonColors.borderDefault}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: neonColors.neonGreen }}
          />
          <span className="text-sm font-semibold" style={{ color: neonColors.textPrimary }}>
            Watchlist
          </span>
        </div>
        <span className="text-xs" style={{ color: neonColors.textDim }}>
          {ASSETS.length} assets
        </span>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {ASSETS.map((asset) => (
          <AssetRow
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            isSelected={selectedSymbol === asset.symbol}
            onSelect={onSelectSymbol}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 text-center"
        style={{ borderTop: `1px solid ${neonColors.borderDefault}` }}
      >
        <span className="text-[10px]" style={{ color: neonColors.textDim }}>
          Click asset to analyze
        </span>
      </div>
    </div>
  );
};

export default AssetWatchlist;
