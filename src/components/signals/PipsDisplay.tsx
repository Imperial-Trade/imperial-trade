
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { calculateEnhancedPips, calculateDistanceToEntry, getPipColor } from '@/utils/enhancedPipCalculations';

interface PipsDisplayProps {
  entryPrice: number;
  currentPrice: number;
  symbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PipsDisplay = ({
  entryPrice,
  currentPrice,
  symbol,
  tradeType,
  status,
  className = '',
  showIcon = true,
  size = 'md'
}: PipsDisplayProps) => {
  const pipData = useMemo(() => {
    if (status === 'pending') {
      return calculateDistanceToEntry(entryPrice, currentPrice, symbol);
    }
    return calculateEnhancedPips(entryPrice, currentPrice, symbol, tradeType);
  }, [entryPrice, currentPrice, symbol, tradeType, status]);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const getIcon = () => {
    if (status === 'pending') return <Target className={iconSize[size]} />;
    if (pipData.direction === 'profit') return <TrendingUp className={iconSize[size]} />;
    if (pipData.direction === 'loss') return <TrendingDown className={iconSize[size]} />;
    return <Minus className={iconSize[size]} />;
  };

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'pending') return 'outline';
    if (pipData.direction === 'profit') return 'default';
    if (pipData.direction === 'loss') return 'destructive';
    return 'secondary';
  };

  const getBadgeColor = () => {
    if (status === 'pending') {
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    }
    
    switch (pipData.direction) {
      case 'profit':
        return pipData.significance === 'major' 
          ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
          : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'loss':
        return pipData.significance === 'major'
          ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const label = status === 'pending' 
    ? `${pipData.formattedPips} to entry`
    : `${pipData.formattedPips} pips`;

  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} ${getBadgeColor()} ${className} font-mono font-semibold`}
    >
      {showIcon && getIcon()}
      <span className={showIcon ? 'ml-1' : ''}>{label}</span>
    </Badge>
  );
};
