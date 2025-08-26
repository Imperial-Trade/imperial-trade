
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TradeStatusBadge } from './TradeStatusBadge';
import { LivePriceWidget } from './LivePriceWidget';
import { TradingCalculator } from './TradingCalculator';
import { QuickCopyPanel } from './QuickCopyPanel';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { TradeAlertCardProps } from '@/types/components';
import { formatPrice } from '@/utils/priceUtils';
import { cn } from '@/lib/utils';

export const TradeAlertCard: React.FC<TradeAlertCardProps> = ({
  alert,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  isAdmin,
  isCreator,
  livePrice,
  connectionStatus,
  priceSource,
  isRecentClosure,
  className,
}) => {
  const isLong = alert.trade_type === 'buy' || alert.trade_type === 'buy_limit';
  const isLimitOrder = alert.trade_type === 'buy_limit' || alert.trade_type === 'sell_limit';
  
  const getTradeTypeIcon = () => {
    return isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTradeTypeColor = () => {
    return isLong ? 'text-emerald-600' : 'text-red-600';
  };

  const getBorderColor = () => {
    if (alert.status === 'closed') return 'border-slate-200';
    if (alert.status === 'active') return isLong ? 'border-emerald-500' : 'border-red-500';
    if (alert.status === 'partially_profited') return 'border-amber-500';
    return 'border-slate-300';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCreatorInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleManualClose = async () => {
    await onStatusUpdate(alert, 'closed');
  };

  const handleActivateOrder = async () => {
    await onOrderActivation(alert);
  };

  const shouldShowConnectionWarning = () => {
    return connectionStatus === 'disconnected' || connectionStatus === 'error';
  };

  return (
    <Card className={cn(
      `transition-all duration-200 hover:shadow-lg ${getBorderColor()}`,
      {
        'bg-slate-50': alert.status === 'closed',
        'shadow-md': alert.status === 'active' || alert.status === 'partially_profited',
        'ring-2 ring-emerald-500/20': isRecentClosure && alert.close_reason?.includes('tp'),
        'ring-2 ring-red-500/20': isRecentClosure && alert.close_reason === 'stop_loss',
      },
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-slate-100 ${getTradeTypeColor()}`}>
              {getTradeTypeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{alert.asset_name}</h3>
                <Badge variant="outline" className="text-xs">
                  {alert.trade_type.toUpperCase()}
                </Badge>
                {isLimitOrder && alert.status === 'pending' && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    LIMIT
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600">{alert.tradermade_symbol}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shouldShowConnectionWarning() && (
              <AlertTriangle className="h-4 w-4 text-amber-500" title="Connection issues" />
            )}
            <TradeStatusBadge 
              alert={alert} 
              updatedDate={alert.updated_date}
              isRecentClosure={isRecentClosure}
            />
          </div>
        </div>

        {alert.creator && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={alert.creator.avatar_url || ''} alt={alert.creator.display_name} />
              <AvatarFallback className="text-xs">
                {getCreatorInitials(alert.creator.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-600">
              {alert.creator.display_name}
            </span>
            <Badge variant="outline" className="text-xs">
              {alert.creator.role}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 font-medium">Entry</p>
            <p className="font-semibold">{formatPrice(alert.entry_price)}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Stop Loss</p>
            <p className="font-semibold text-red-600">{formatPrice(alert.stop_loss)}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Created</p>
            <p className="font-semibold">{formatDate(alert.created_date)}</p>
          </div>
          {alert.updated_date !== alert.created_date && (
            <div>
              <p className="text-slate-500 font-medium">Updated</p>
              <p className="font-semibold">{formatDate(alert.updated_date)}</p>
            </div>
          )}
        </div>

        {(alert.tp1 || alert.tp2 || alert.tp3 || alert.tp4 || alert.tp5) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Take Profit Levels</p>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[1, 2, 3, 4, 5].map((tpNum) => {
                  const tpValue = alert[`tp${tpNum}` as keyof typeof alert] as number;
                  const isHit = alert.tp_hits?.includes(tpNum);
                  
                  if (!tpValue) return null;
                  
                  return (
                    <div key={tpNum} className={cn(
                      "p-2 rounded border text-center",
                      isHit 
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                        : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="font-medium">TP{tpNum}</div>
                      <div>{formatPrice(tpValue)}</div>
                      {isHit && <div className="text-emerald-600">✓ HIT</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {alert.notes && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Notes</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                {alert.notes}
              </p>
            </div>
          </>
        )}

        {(alert.status === 'active' || alert.status === 'partially_profited') && (
          <>
            <Separator />
            <LivePriceWidget
              alert={alert}
              onTakeProfitHit={onTakeProfitHit}
              onStopLossHit={onStopLossHit}
              onOrderActivation={onOrderActivation}
              livePrice={livePrice}
              connectionStatus={connectionStatus}
              priceSource={priceSource}
            />
          </>
        )}

        {livePrice && (
          <>
            <Separator />
            <TradingCalculator alert={alert} livePrice={livePrice} />
          </>
        )}

        <Separator />
        <QuickCopyPanel alert={alert} />

        {(isAdmin || isCreator) && alert.status !== 'closed' && (
          <>
            <Separator />
            <div className="flex gap-2">
              {alert.status === 'pending' && isLimitOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActivateOrder}
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  Activate Order
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualClose}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Close Manually
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
