
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useWebSocketLivePrice } from '@/hooks/useWebSocketLivePrice';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Shield, 
  User,
  Crown,
  GraduationCap,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedSignalCardProps {
  signal: TradeAlertWithProfile;
  onUpdate?: (signal: TradeAlertWithProfile) => void;
  onDelete?: (signalId: string) => void;
  className?: string;
}

export const EnhancedSignalCard: React.FC<EnhancedSignalCardProps> = ({ 
  signal, 
  onUpdate, 
  onDelete, 
  className 
}) => {
  const { price: currentPrice, isLoading: priceLoading } = useWebSocketLivePrice(
    signal.tradermadeSymbol || signal.assetName
  );

  const isBuySignal = signal.tradeType === 'buy';
  const isActiveSignal = signal.status === 'active';
  const isPendingSignal = signal.status === 'pending';
  const isClosedSignal = signal.status === 'closed';

  // Calculate P&L if we have current price and signal is active
  const calculatePnL = () => {
    if (!currentPrice || !isActiveSignal) return null;
    
    const priceDiff = isBuySignal 
      ? currentPrice - signal.entryPrice 
      : signal.entryPrice - currentPrice;
    
    const pnlPercentage = (priceDiff / signal.entryPrice) * 100;
    return {
      absolute: priceDiff,
      percentage: pnlPercentage,
      isProfit: pnlPercentage > 0
    };
  };

  const pnl = calculatePnL();

  const getStatusBadgeVariant = () => {
    switch (signal.status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  const getCreatorIcon = () => {
    if (signal.creator?.access_level === 'admin') {
      return <Crown className="w-3 h-3 text-amber-500" />;
    }
    if (signal.creator?.user_type === 'educator') {
      return <GraduationCap className="w-3 h-3 text-blue-500" />;
    }
    return <User className="w-3 h-3 text-muted-foreground" />;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(signal.assetName.includes('JPY') ? 3 : 5);
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  // Check if a TP level has been hit - Fixed TypeScript error
  const isTpHit = (tpLevel: number) => {
    if (!signal.tpHits || !Array.isArray(signal.tpHits)) return false;
    return signal.tpHits.includes(`tp${tpLevel}`);
  };

  return (
    <Card className={cn(
      "border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-lg h-fit",
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Header - Creator and Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={signal.creator?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {signal.creator?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground truncate">
                {signal.creator?.display_name || 'Unknown User'}
              </span>
              {getCreatorIcon()}
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="truncate">{formatTimeAgo(signal.createdAt)}</span>
          </div>
        </div>

        {/* Asset and Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground truncate">
              {signal.assetName}
            </h3>
            <div className="flex flex-col gap-1">
              <Badge 
                variant={getStatusBadgeVariant()}
                className={cn(
                  "text-xs font-medium",
                  signal.status === 'pending' && "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}
              >
                {signal.status === 'pending' ? 'PENDING' : signal.status.toUpperCase()}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium",
                  isBuySignal 
                    ? "border-green-500/30 text-green-600 bg-green-500/5" 
                    : "border-red-500/30 text-red-600 bg-red-500/5"
                )}
              >
                {isBuySignal ? 'BUY' : 'SELL'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Live Price Section (for active signals) */}
        {isActiveSignal && (
          <div className="bg-card/50 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live</span>
              </div>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {priceLoading ? (
                <div className="animate-pulse h-6 w-24 bg-muted rounded" />
              ) : (
                <span className="text-lg font-bold text-green-500">
                  ${currentPrice ? formatPrice(currentPrice) : '--'}
                </span>
              )}
              
              {pnl && (
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "flex items-center gap-1",
                    pnl.isProfit ? "text-green-500" : "text-red-500"
                  )}>
                    {pnl.isProfit ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="text-sm font-medium">
                      {pnl.isProfit ? '+' : ''}{pnl.absolute.toFixed(2)}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-1 py-0.5 rounded",
                    pnl.isProfit 
                      ? "bg-green-500/10 text-green-600" 
                      : "bg-red-500/10 text-red-600"
                  )}>
                    ({pnl.isProfit ? '+' : ''}{pnl.percentage.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Trading Levels - Compact Vertical Layout */}
        <div className="space-y-2">
          {/* Entry Price */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium text-muted-foreground">Entry</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              ${formatPrice(signal.entryPrice)}
            </span>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium text-muted-foreground">Stop Loss</span>
            </div>
            <span className="text-sm font-bold text-red-600">
              ${formatPrice(signal.stopLoss)}
            </span>
          </div>

          {/* Take Profit Levels */}
          {[
            { level: 1, price: signal.tp1 },
            { level: 2, price: signal.tp2 },
            { level: 3, price: signal.tp3 },
            { level: 4, price: signal.tp4 },
            { level: 5, price: signal.tp5 },
          ].map(({ level, price }) => 
            price ? (
              <div 
                key={level}
                className={cn(
                  "flex items-center justify-between p-2 bg-muted/30 rounded-md",
                  isTpHit(level) && "bg-blue-500/10 border border-blue-500/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isTpHit(level) ? "bg-blue-600" : "bg-blue-500"
                  )}></div>
                  <span className="text-xs font-medium text-muted-foreground">TP{level}</span>
                  {isTpHit(level) && <span className="text-xs text-blue-600">✓</span>}
                </div>
                <span className="text-sm font-bold text-blue-600">
                  ${formatPrice(price)}
                </span>
              </div>
            ) : null
          )}
        </div>

        {/* Notes */}
        {signal.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Notes</h4>
              <p className="text-xs text-foreground bg-muted/30 p-2 rounded-md line-clamp-3">
                {signal.notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
