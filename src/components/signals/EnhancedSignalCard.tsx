
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
  MoreVertical
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

  return (
    <Card className={cn(
      "border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-lg",
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              isBuySignal 
                ? "bg-green-500/10 text-green-500" 
                : "bg-red-500/10 text-red-500"
            )}>
              {isBuySignal ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground">
                  {signal.assetName}
                </h3>
                <Badge 
                  variant={getStatusBadgeVariant()}
                  className="text-xs font-medium"
                >
                  {signal.status.toUpperCase()}
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
                  {signal.tradeType.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(signal.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pnl && (
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                pnl.isProfit 
                  ? "bg-green-500/10 text-green-600" 
                  : "bg-red-500/10 text-red-600"
              )}>
                {pnl.isProfit ? '+' : ''}{pnl.percentage.toFixed(2)}%
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Price Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Entry Price</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatPrice(signal.entryPrice)}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Stop Loss</span>
            </div>
            <p className="text-lg font-bold text-red-600">
              {formatPrice(signal.stopLoss)}
            </p>
          </div>
        </div>

        {/* Current Price (for active signals) */}
        {isActiveSignal && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Current Price</span>
              {priceLoading ? (
                <div className="animate-pulse h-4 w-16 bg-muted rounded" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {currentPrice ? formatPrice(currentPrice) : '--'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Take Profit Levels */}
        {(signal.tp1 || signal.tp2 || signal.tp3 || signal.tp4 || signal.tp5) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" />
                Take Profit Levels
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { level: 'TP1', price: signal.tp1 },
                  { level: 'TP2', price: signal.tp2 },
                  { level: 'TP3', price: signal.tp3 },
                  { level: 'TP4', price: signal.tp4 },
                  { level: 'TP5', price: signal.tp5 },
                ].map(({ level, price }) => 
                  price ? (
                    <div 
                      key={level}
                      className={cn(
                        "px-2 py-1 rounded text-xs text-center",
                        signal.tpHits?.includes(level.toLowerCase()) 
                          ? "bg-green-500/20 text-green-700 border border-green-500/30" 
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <div className="font-medium">{level}</div>
                      <div>{formatPrice(price)}</div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </>
        )}

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

        {/* Creator Info */}
        <Separator />
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
            </div>
          </div>
          
          {signal.closeReason && isClosedSignal && (
            <Badge variant="outline" className="text-xs">
              {signal.closeReason}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
