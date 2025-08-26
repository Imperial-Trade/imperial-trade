
import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, TrendingUp, TrendingDown, Copy, Target, Shield, CheckCircle2 } from 'lucide-react';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { PipsDisplay } from './PipsDisplay';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface SignalCardProps {
  alert: TradeAlertWithProfile;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  isOwner?: boolean;
  className?: string;
}

export const SignalCard = memo(({ alert, onUpdate, isOwner, className = '' }: SignalCardProps) => {
  const { prices } = useWebSocketPrices();
  const currentPrice = prices[alert.tradermadeSymbol || alert.assetName]?.price || 0;
  
  const isBuyTrade = alert.tradeType.startsWith('buy');
  const totalTPs = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter(Boolean).length;
  const tpHitsCount = alert.tpHits?.length || 0;

  // Get provider info with fallback
  const providerName = alert.creator?.display_name || 'Unknown Provider';
  const providerAvatar = alert.creator?.avatar_url;
  const providerInitials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Time since published/activated
  const timeLabel = alert.status === 'active' && alert.activatedAt 
    ? `Active ${formatDistanceToNow(new Date(alert.activatedAt), { addSuffix: true })}`
    : `Posted ${formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}`;

  // Copy signal details to clipboard
  const handleCopyDetails = async () => {
    const tpString = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5]
      .filter(Boolean)
      .map((tp, index) => `TP${index + 1}: ${tp}`)
      .join(' | ');

    const details = `${alert.assetName} ${alert.tradeType.toUpperCase()}
Entry: ${alert.entryPrice}
SL: ${alert.stopLoss}
${tpString}
Provider: ${providerName}`;

    try {
      await navigator.clipboard.writeText(details);
      toast({
        title: "Signal Copied",
        description: "Signal details copied to clipboard"
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy Failed", 
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Get status color and label
  const getStatusBadge = () => {
    switch (alert.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Pending</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case 'partially_profited':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Partial Profit</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Closed</Badge>;
      default:
        return <Badge variant="outline">{alert.status}</Badge>;
    }
  };

  // Calculate visual progress for TP levels
  const getTpProgressIndicators = () => {
    if (totalTPs === 0) return null;

    return (
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map(level => {
          const tpPrice = alert[`tp${level}` as keyof TradeAlertWithProfile] as number;
          if (!tpPrice) return null;
          
          const isHit = alert.tpHits?.includes(level);
          return (
            <div 
              key={level}
              className={`flex-1 h-2 rounded-sm transition-colors ${
                isHit 
                  ? 'bg-green-500 shadow-sm' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={`TP${level}: ${tpPrice} ${isHit ? '(Hit)' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Card className={`bg-card border-border hover:border-primary/20 transition-all duration-200 ${className}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Provider & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={providerAvatar} alt={providerName} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {providerInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{providerName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timeLabel}</span>
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Currency Pair & Trade Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{alert.assetName}</h3>
            <Badge variant={isBuyTrade ? "default" : "secondary"} className="text-xs">
              {isBuyTrade ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {alert.tradeType.toUpperCase()}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyDetails}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Price Information Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Entry Price</div>
            <div className="font-mono font-semibold">${alert.entryPrice.toFixed(4)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Current Price</div>
            <div className="font-mono font-semibold">
              {currentPrice > 0 ? `$${currentPrice.toFixed(4)}` : '--'}
            </div>
          </div>
        </div>

        {/* Dynamic Pips Display */}
        {currentPrice > 0 && (
          <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
            <span className="text-sm font-medium text-muted-foreground">
              {alert.status === 'pending' ? 'Distance to Entry' : 'Pips in Progress'}
            </span>
            <PipsDisplay
              entryPrice={alert.entryPrice}
              currentPrice={currentPrice}
              symbol={alert.tradermadeSymbol || alert.assetName}
              tradeType={alert.tradeType}
              status={alert.status}
              size="md"
            />
          </div>
        )}

        {/* Stop Loss & Take Profit Levels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Shield className="h-4 w-4 text-red-500" />
              <span>Stop Loss</span>
            </div>
            <span className="font-mono font-semibold">${alert.stopLoss.toFixed(4)}</span>
          </div>

          {totalTPs > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>Take Profits ({tpHitsCount}/{totalTPs} Hit)</span>
                </div>
                {tpHitsCount > 0 && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
              {getTpProgressIndicators()}
            </div>
          )}
        </div>

        {/* Action Buttons for Owner */}
        {isOwner && alert.status !== 'closed' && (
          <div className="flex gap-2 pt-2 border-t">
            {alert.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onUpdate?.(alert.id, { status: 'active' })}
                className="flex-1"
              >
                Activate
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onUpdate?.(alert.id, { status: 'closed', closeReason: 'manual' })}
              className="flex-1"
            >
              {alert.status === 'pending' ? 'Cancel' : 'Close'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SignalCard.displayName = 'SignalCard';
