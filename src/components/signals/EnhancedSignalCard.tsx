
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

  // Check if a TP level has been hit
  const isTpHit = (level: string) => {
    return signal.tpHits && signal.tpHits.includes(level.toLowerCase());
  };

  return (
    <Card className={cn(
      "border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-lg",
      className
    )}>
      <CardContent className="p-6 space-y-6">
        {/* Header - Creator and Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={signal.creator?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {signal.creator?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {signal.creator?.display_name || 'Unknown User'}
              </span>
              {getCreatorIcon()}
              <Badge variant="outline" className="text-xs">
                {signal.creator?.access_level === 'admin' ? 'Admin' : 'Educator'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(signal.createdAt)}</span>
          </div>
        </div>

        {/* Asset and Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-foreground">
              {signal.assetName}
            </h3>
            <div className="flex items-center gap-2">
              <Badge 
                variant={getStatusBadgeVariant()}
                className={cn(
                  "text-xs font-medium",
                  signal.status === 'pending' && "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}
              >
                {signal.status === 'pending' ? '⏳ PENDING BUY LIMIT' : signal.status.toUpperCase()}
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
                {isBuySignal ? 'Active Buy' : 'Active Sell'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Live Price Section (for active signals) */}
        {isActiveSignal && (
          <div className="bg-card/50 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Live Price for {signal.assetName}</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">15ms</span>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              {priceLoading ? (
                <div className="animate-pulse h-8 w-32 bg-muted rounded" />
              ) : (
                <span className="text-2xl font-bold text-green-500">
                  ${currentPrice ? formatPrice(currentPrice) : '--'}
                </span>
              )}
              
              {pnl && (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1",
                    pnl.isProfit ? "text-green-500" : "text-red-500"
                  )}>
                    {pnl.isProfit ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {pnl.isProfit ? '+' : ''}{pnl.absolute.toFixed(2)}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    pnl.isProfit 
                      ? "bg-green-500/10 text-green-600" 
                      : "bg-red-500/10 text-red-600"
                  )}>
                    ({pnl.isProfit ? '+' : ''}{pnl.percentage.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>📈 Updated: 12:41:30 PM</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Trading Levels - Vertical Layout */}
        <div className="space-y-4">
          {/* Entry Price */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-muted-foreground">Entry Price</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              ${formatPrice(signal.entryPrice)}
            </span>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-muted-foreground">Stop Loss</span>
            </div>
            <span className="text-lg font-bold text-red-600">
              ${formatPrice(signal.stopLoss)}
            </span>
          </div>

          {/* Take Profit Levels */}
          {(signal.tp1 || signal.tp2 || signal.tp3 || signal.tp4 || signal.tp5) && (
            <div className="space-y-2">
              {[
                { level: 'Take Profit 1', price: signal.tp1 },
                { level: 'Take Profit 2', price: signal.tp2 },
                { level: 'Take Profit 3', price: signal.tp3 },
                { level: 'Take Profit 4', price: signal.tp4 },
                { level: 'Take Profit 5', price: signal.tp5 },
              ].map(({ level, price }, index) => 
                price ? (
                  <div 
                    key={level}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-muted-foreground">{level}</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      ${formatPrice(price)}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {signal.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
              <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                {signal.notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
