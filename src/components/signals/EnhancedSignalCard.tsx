
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown, Target, Shield, CheckCircle2 } from 'lucide-react';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { SignalStatusBadge } from './SignalStatusBadge';
import { LivePriceWidget } from './LivePriceWidget';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface EnhancedSignalCardProps {
  alert: TradeAlertWithProfile;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  isOwner?: boolean;
}

export const EnhancedSignalCard = ({ alert, onUpdate, isOwner }: EnhancedSignalCardProps) => {
  console.log('🎯 Rendering EnhancedSignalCard for:', alert.id, alert.assetName);
  
  const { prices } = useWebSocketPrices();
  const currentPrice = prices[alert.tradermadeSymbol || alert.assetName]?.price || 0;

  const isBuyTrade = alert.tradeType.startsWith('buy');
  const totalTPs = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter(Boolean).length;
  const tpHitsCount = alert.tpHits?.length || 0;

  // Calculate P&L based on current status
  const calculateUnrealizedPnL = () => {
    if (alert.status === 'pending' || !currentPrice) return 0;
    
    const entryPrice = alert.entryPrice;
    const priceDiff = currentPrice - entryPrice;
    return isBuyTrade ? priceDiff : -priceDiff;
  };

  const unrealizedPnL = calculateUnrealizedPnL();
  const pnlColor = unrealizedPnL > 0 ? 'text-green-600' : unrealizedPnL < 0 ? 'text-red-600' : 'text-gray-600';

  // Get next TP target
  const getNextTPTarget = () => {
    const allTPs = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price);

    const nextTP = allTPs.find(tp => !alert.tpHits?.includes(tp.level));
    return nextTP;
  };

  const nextTP = getNextTPTarget();

  // Helper function to get close reason label
  const getCloseReasonLabel = (closeReason?: string) => {
    if (!closeReason) return null;
    
    switch (closeReason) {
      case 'stop_loss':
        return 'Closed - Stop Loss Hit';
      case 'manual':
        return 'Manually Closed';
      case 'tp1':
      case 'tp2':
      case 'tp3':
      case 'tp4':
      case 'tp5':
        return `Closed - ${closeReason.toUpperCase()} Hit`;
      case 'reversal_after_tp':
        return 'Closed - Reversal After TP';
      default:
        return 'Closed';
    }
  };

  const showLivePrice = alert.status === 'active' || alert.status === 'partially_profited';
  
  console.log('📊 Signal card render data:', {
    id: alert.id,
    assetName: alert.assetName,
    tradermadeSymbol: alert.tradermadeSymbol,
    status: alert.status,
    showLivePrice,
    currentPrice,
    creator: alert.creator?.display_name
  });

  // Convert alert to format expected by LivePriceWidget
  const alertForWidget = {
    id: alert.id,
    asset_name: alert.assetName,
    tradermade_symbol: alert.tradermadeSymbol,
    trade_type: alert.tradeType,
    entry_price: alert.entryPrice,
    stop_loss: alert.stopLoss,
    status: alert.status,
    tp1: alert.tp1,
    tp2: alert.tp2,
    tp3: alert.tp3,
    tp4: alert.tp4,
    tp5: alert.tp5,
    tp_hits: alert.tpHits || []
  };

  return (
    <div className="space-y-4">
      {/* Live Price Widget for Active/Partially Profited Signals */}
      {showLivePrice && (
        <LivePriceWidget 
          alert={alertForWidget}
          onTakeProfitHit={async (alert, updatedHits, shouldAutoClose, autoCloseReason) => {
            if (onUpdate) {
              const updates = {
                tpHits: updatedHits,
                ...(shouldAutoClose && { status: 'closed', closeReason: autoCloseReason })
              };
              await onUpdate(alert.id, updates);
            }
          }}
          onStopLossHit={async (alert, closeReason) => {
            if (onUpdate) {
              await onUpdate(alert.id, { status: 'closed', closeReason });
            }
          }}
          onOrderActivation={async (alert) => {
            if (onUpdate) {
              await onUpdate(alert.id, { status: 'active' });
            }
          }}
        />
      )}
      
      {/* Main Signal Card */}
      <Card className="bg-card border-border hover:border-primary/20 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{alert.assetName}</CardTitle>
              <Badge variant={isBuyTrade ? "default" : "secondary"} className="text-xs">
                {isBuyTrade ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {alert.tradeType.toUpperCase()}
              </Badge>
            </div>
            <SignalStatusBadge status={alert.status} />
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>by {alert.creator?.display_name || 'Unknown'}</span>
            <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Entry Price</div>
              <div className="font-semibold">${alert.entryPrice.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="font-semibold">${currentPrice ? currentPrice.toFixed(4) : '--'}</div>
            </div>
          </div>

          {/* P&L Display for Active/Partially Profited Signals */}
          {(alert.status === 'active' || alert.status === 'partially_profited') && currentPrice && (
            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
              <span className="text-sm text-muted-foreground">Unrealized P&L</span>
              <span className={`font-semibold ${pnlColor}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(4)} pips
              </span>
            </div>
          )}

          {/* TP Progress for Active/Partially Profited Signals */}
          {(alert.status === 'active' || alert.status === 'partially_profited') && totalTPs > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Take Profit Progress</span>
                <span className="font-medium">{tpHitsCount}/{totalTPs} TPs Hit</span>
              </div>
              
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(level => {
                  const tpPrice = alert[`tp${level}` as keyof TradeAlertWithProfile] as number;
                  if (!tpPrice) return null;
                  
                  const isHit = alert.tpHits?.includes(level);
                  return (
                    <div 
                      key={level}
                      className={`flex-1 h-2 rounded-sm transition-colors ${
                        isHit 
                          ? 'bg-green-500' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  );
                })}
              </div>

              {nextTP && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>Next: TP{nextTP.level} @ ${nextTP.price.toFixed(4)}</span>
                </div>
              )}
            </div>
          )}

          {/* Stop Loss Information */}
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Stop Loss:</span>
            <span className="font-medium">${alert.stopLoss.toFixed(4)}</span>
          </div>

          {/* Close Reason for Closed Signals */}
          {alert.status === 'closed' && alert.closeReason && (
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {getCloseReasonLabel(alert.closeReason)}
              </span>
            </div>
          )}

          {/* Notes */}
          {alert.notes && (
            <div className="text-sm text-muted-foreground bg-secondary/30 p-2 rounded-md">
              {alert.notes}
            </div>
          )}

          {/* Actions for Owner */}
          {isOwner && alert.status !== 'closed' && (
            <div className="flex gap-2 pt-2">
              {alert.status === 'pending' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onUpdate?.(alert.id, { status: 'active' })}>
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onUpdate?.(alert.id, { status: 'closed', closeReason: 'manual' })}>
                    Cancel
                  </Button>
                </>
              )}
              
              {(alert.status === 'active' || alert.status === 'partially_profited') && (
                <Button size="sm" variant="outline" onClick={() => onUpdate?.(alert.id, { status: 'closed', closeReason: 'manual' })}>
                  Close Signal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
