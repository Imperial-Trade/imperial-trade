
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, TrendingUp, TrendingDown } from 'lucide-react';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { SignalStatusBadge } from './SignalStatusBadge';
import { PipsDisplay } from './PipsDisplay';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { formatDistanceToNow } from 'date-fns';

interface CompactSignalCardProps {
  alert: TradeAlertWithProfile;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  isOwner?: boolean;
}

export const CompactSignalCard = ({ alert, onUpdate, isOwner }: CompactSignalCardProps) => {
  const { prices } = useWebSocketPrices();
  const currentPrice = prices[alert.tradermadeSymbol || alert.assetName]?.price || 0;
  
  const isBuyTrade = alert.tradeType.startsWith('buy');
  
  const handleCopyDetails = () => {
    const details = `${alert.assetName} ${alert.tradeType.toUpperCase()} @ ${alert.entryPrice}
SL: ${alert.stopLoss}${alert.tp1 ? ` | TP1: ${alert.tp1}` : ''}${alert.tp2 ? ` | TP2: ${alert.tp2}` : ''}
by ${alert.creator?.display_name || 'Unknown'}`;
    
    navigator.clipboard.writeText(details);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-semibold text-sm truncate">{alert.assetName}</span>
          <Badge variant={isBuyTrade ? "default" : "secondary"} className="text-xs shrink-0">
            {isBuyTrade ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {alert.tradeType.toUpperCase()}
          </Badge>
        </div>
        <SignalStatusBadge status={alert.status} className="text-xs" />
      </div>

      {/* Price & P&L Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Entry: <span className="text-foreground font-mono">${alert.entryPrice.toFixed(4)}</span></span>
          {currentPrice > 0 && (
            <span className="text-muted-foreground">Current: <span className="text-foreground font-mono">${currentPrice.toFixed(4)}</span></span>
          )}
        </div>
        {currentPrice > 0 && (
          <PipsDisplay
            entryPrice={alert.entryPrice}
            currentPrice={currentPrice}
            symbol={alert.tradermadeSymbol || alert.assetName}
            tradeType={alert.tradeType}
            status={alert.status}
            size="sm"
            showIcon={false}
          />
        )}
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>by {alert.creator?.display_name || 'Unknown'}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyDetails}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {isOwner && alert.status === 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate?.(alert.id, { status: 'active' })}
              className="h-6 px-2 text-xs"
            >
              Activate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
