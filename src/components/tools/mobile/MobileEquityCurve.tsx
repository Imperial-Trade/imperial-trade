import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import { TradeJournalEntry } from '@/api/entities';
import { Button } from '@/components/ui/button';

interface MobileEquityCurveProps {
  entries: TradeJournalEntry[];
  showStats?: boolean;
  onToggleStats?: () => void;
}

const MobileEquityCurve = memo(({ entries, showStats = true, onToggleStats }: MobileEquityCurveProps) => {
  const equityData = useMemo(() => {
    if (!entries.length) return [];

    // Sort entries by trade_date strings (YYYY-MM-DD format sorts naturally)
    const sortedEntries = [...entries].sort((a, b) => 
      a.trade_date.localeCompare(b.trade_date)
    );

    let cumulativePnL = 0;
    return sortedEntries.map((entry, index) => {
      cumulativePnL += entry.pnl;
      return {
        x: index,
        y: cumulativePnL,
        pnl: entry.pnl,
        date: entry.trade_date,
        asset: entry.asset_ticker
      };
    });
  }, [entries]);

  if (!equityData.length) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Minus className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No equity data yet</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...equityData.map(d => d.y));
  const minValue = Math.min(...equityData.map(d => d.y));
  const range = maxValue - minValue || 1;
  const finalValue = equityData[equityData.length - 1]?.y || 0;

  // Create SVG path
  const viewBoxWidth = 300;
  const viewBoxHeight = 120;
  const padding = 10;

  const points = equityData.map((point, index) => {
    const x = padding + (index / (equityData.length - 1 || 1)) * (viewBoxWidth - 2 * padding);
    const y = padding + (1 - (point.y - minValue) / range) * (viewBoxHeight - 2 * padding);
    return { x, y, data: point };
  });

  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  // Create gradient path for fill
  const fillPath = pathData + ` L ${viewBoxWidth - padding} ${viewBoxHeight - padding} L ${padding} ${viewBoxHeight - padding} Z`;

  const trend = finalValue >= 0 ? 'up' : finalValue < 0 ? 'down' : 'neutral';
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';
  const gradientId = `equity-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-3"
    >
      {/* Equity Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Minus className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            Current Equity
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${
            finalValue >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {finalValue >= 0 ? '+' : ''}${finalValue.toFixed(2)}
          </span>
          {onToggleStats && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleStats}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              {showStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-24 overflow-visible"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Zero line */}
          {minValue < 0 && maxValue > 0 && (
            <line
              x1={padding}
              y1={padding + (1 - (0 - minValue) / range) * (viewBoxHeight - 2 * padding)}
              x2={viewBoxWidth - padding}
              y2={padding + (1 - (0 - minValue) / range) * (viewBoxHeight - 2 * padding)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.3"
            />
          )}
          
          {/* Fill area */}
          <path
            d={fillPath}
            fill={`url(#${gradientId})`}
            className="transition-all duration-300"
          />
          
          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={point.data.pnl >= 0 ? '#10b981' : '#ef4444'}
              stroke="white"
              strokeWidth="1"
              className="transition-all duration-300 hover:r-3"
            />
          ))}
        </svg>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">High</p>
          <p className="text-sm font-medium text-emerald-600">
            +${maxValue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="text-sm font-medium text-foreground">
            {equityData.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Low</p>
          <p className="text-sm font-medium text-red-500">
            ${minValue.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

MobileEquityCurve.displayName = 'MobileEquityCurve';

export default MobileEquityCurve;