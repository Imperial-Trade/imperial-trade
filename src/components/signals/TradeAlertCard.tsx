import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Activity,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TradeStatusBadge from './TradeStatusBadge';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { TradeAlertCloseReason } from '@/types/trading';

interface TradeAlertCardProps {
  alert: {
    id: string;
    asset_name: string;
    tradermade_symbol: string;
    trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    entry_price: number;
    stop_loss: number;
    status: 'pending' | 'active' | 'closed' | 'partially_profited';
    tp1?: number;
    tp2?: number;
    tp3?: number;
    tp4?: number;
    tp5?: number;
    tp_hits: number[];
    notes?: string;
    close_reason?: TradeAlertCloseReason;
    created_date: string;
    updated_date: string;
    profiles?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  livePrice?: number;
  onStatusUpdate?: (alert: any, newStatus: string) => Promise<void>;
  onTakeProfitHit?: (alert: any, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string) => Promise<void>;
  onStopLossHit?: (alert: any, closeReason: string) => Promise<void>;
  onOrderActivation?: (alert: any) => Promise<void>;
  onEdit?: (alert: any) => void;
  onDelete?: (alert: any) => void;
  isAdmin?: boolean;
  isCreator?: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  priceSource?: string;
  isRecentClosure?: boolean;
}

const TradeAlertCard: React.FC<TradeAlertCardProps> = ({
  alert,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  onEdit,
  onDelete,
  isAdmin = false,
  isCreator = false,
  connectionStatus,
  priceSource = 'tradermade',
  isRecentClosure = false
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTakingProfit, setIsTakingProfit] = useState(false);
  const [selectedTP, setSelectedTP] = useState<number | null>(null);
  const [autoClose, setAutoClose] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  const {
    id: alertId,
    asset_name: assetName,
    tradermade_symbol: tradermadeSymbol,
    trade_type: tradeType,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    status,
    tp1,
    tp2,
    tp3,
    tp4,
    tp5,
    tp_hits: tpHits,
    notes,
    close_reason: closeReason,
    created_date: createdDate,
    updated_date: updatedDate,
    profiles
  } = alert;

  const fullName = profiles?.full_name || 'Unknown User';
  const avatarUrl = profiles?.avatar_url || '/avatars/avatar-1.png';

  const friendlyType =
    tradeType === 'buy_limit' ? 'Buy Limit' :
    tradeType === 'sell_limit' ? 'Sell Limit' :
    tradeType === 'buy' ? 'Buy' :
    tradeType === 'sell' ? 'Sell' : undefined;

  const isLimitType = tradeType === 'buy_limit' || tradeType === 'sell_limit';
  const isActive = status === 'active';
  const isPending = status === 'pending';
  const isClosed = status === 'closed';

  const tpLevels = useMemo(() => {
    const levels = [];
    if (tp1) levels.push({ tp: tp1, level: 1 });
    if (tp2) levels.push({ tp: tp2, level: 2 });
    if (tp3) levels.push({ tp: tp3, level: 3 });
    if (tp4) levels.push({ tp: tp4, level: 4 });
    if (tp5) levels.push({ tp: tp5, level: 5 });
    return levels;
  }, [tp1, tp2, tp3, tp4, tp5]);

  const unhitTpLevels = useMemo(() => {
    return tpLevels.filter(tp => !tpHits.includes(tp.level));
  }, [tpLevels, tpHits]);

  const hasUnhitTPs = unhitTpLevels.length > 0;

  const riskRewardRatio = useMemo(() => {
    if (!tp1) return null;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(tp1 - entryPrice);
    return (reward / risk).toFixed(2);
  }, [entryPrice, stopLoss, tp1]);

  const timeAgo = useMemo(() => {
    try {
      return formatDistance(new Date(createdDate), new Date(), {
        addSuffix: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'N/A';
    }
  }, [createdDate]);

  const updatedAgo = useMemo(() => {
    try {
      return formatDistance(new Date(updatedDate), new Date(), {
        addSuffix: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'N/A';
    }
  }, [updatedDate]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (onStatusUpdate) {
      try {
        await onStatusUpdate(alert, newStatus);
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
  };

  const handleTakeProfit = async () => {
    if (selectedTP === null) {
      console.warn('No TP selected');
      return;
    }

    if (onTakeProfitHit) {
      try {
        setIsTakingProfit(true);
        const newTPHits = [...tpHits, selectedTP];
        const shouldClose = autoClose || newTPHits.length === tpLevels.length;
        const closeReason = shouldClose ? 'all_tps_hit' : `tp${selectedTP}`;
        await onTakeProfitHit(alert, newTPHits, shouldClose, closeReason);
      } catch (error) {
        console.error('Failed to handle take profit:', error);
      } finally {
        setIsTakingProfit(false);
        setSelectedTP(null);
        setAutoClose(false);
      }
    }
  };

  const handleStopLoss = async () => {
    if (onStopLossHit) {
      try {
        setIsClosing(true);
        await onStopLossHit(alert, 'stop_loss');
      } catch (error) {
        console.error('Failed to handle stop loss:', error);
      } finally {
        setIsClosing(false);
      }
    }
  };

  const handleActivation = async () => {
    if (onOrderActivation) {
      try {
        setIsActivating(true);
        await onOrderActivation(alert);
      } catch (error) {
        console.error('Failed to activate order:', error);
      } finally {
        setIsActivating(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        setIsDeleting(true);
        await onDelete(alert);
      } catch (error) {
        console.error('Failed to delete alert:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const { prices } = useWebSocketPrices();

  React.useEffect(() => {
    const priceData = prices[tradermadeSymbol];
    if (priceData !== undefined) {
      // Handle both number and PriceData object
      const priceValue = typeof priceData === 'number' ? priceData : priceData.price;
      setCurrentPrice(priceValue);
      setPriceLoading(false);
      setPriceError(null);
    } else {
      setPriceLoading(true);
    }
  }, [prices, tradermadeSymbol]);

  return (
    <Card className="glass-effect border-default">
      <CardContent className="relative p-6">
        {isRecentClosure && (
          <Badge className="absolute top-2 right-2 bg-green-500/20 text-green-400 border-green-500/30">
            Recently Closed
          </Badge>
        )}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-primary">{assetName}</h3>
              {isAdmin && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  Admin Signal
                </Badge>
              )}
            </div>
            <p className="text-secondary">
              <span className="font-bold">{tradermadeSymbol}</span> - {friendlyType || tradeType}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(alert)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-red-500 focus:bg-red-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-secondary text-sm">Entry Price</p>
            <p className="text-primary font-bold">{entryPrice}</p>
          </div>
          <div>
            <p className="text-secondary text-sm">Stop Loss</p>
            <p className="text-primary font-bold">{stopLoss}</p>
          </div>
          {riskRewardRatio && (
            <div>
              <p className="text-secondary text-sm">Risk/Reward Ratio (TP1)</p>
              <p className="text-primary font-bold">{riskRewardRatio}</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-secondary text-sm">Take Profit Levels</p>
          <div className="flex items-center gap-2">
            {tpLevels.length > 0 ? (
              tpLevels.map((tp) => (
                <Badge
                  key={tp.level}
                  variant={tpHits.includes(tp.level) ? 'default' : 'outline'}
                  className={tpHits.includes(tp.level)
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'text-primary border-default'}
                >
                  TP{tp.level}: {tp.tp}
                </Badge>
              ))
            ) : (
              <p className="text-secondary">No take profit levels set.</p>
            )}
          </div>
        </div>

        {notes && (
          <div className="mt-4">
            <p className="text-secondary text-sm">Notes</p>
            <p className="text-primary">{notes}</p>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TradeStatusBadge alert={alert} updatedDate={updatedDate} isRecentClosure={isRecentClosure} />
              {isAdmin && (
                <Badge className="text-secondary border-default">
                  {connectionStatus === 'connected' ? (
                    <>
                      Price: {priceLoading ? 'Loading...' : (priceError ? 'Error' : currentPrice)}
                    </>
                  ) : (
                    connectionStatus
                  )}
                </Badge>
              )}
            </div>
            <div className="text-right text-secondary">
              <p className="text-sm">Created {timeAgo}</p>
              <p className="text-sm">Updated {updatedAgo}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          {isPending && isAdmin && (
            <Button
              variant="outline"
              className="bg-accent-green hover:bg-accent-green/90 text-white"
              onClick={handleActivation}
              disabled={isActivating}
            >
              {isActivating ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate Order
                </>
              )}
            </Button>
          )}

          {isActive && isAdmin && hasUnhitTPs && (
            <>
              <select
                value={selectedTP || ''}
                onChange={(e) => setSelectedTP(Number(e.target.value))}
                className="bg-background text-primary border-default rounded px-3 py-2"
              >
                <option value="">Select TP to Hit</option>
                {unhitTpLevels.map((tp) => (
                  <option key={tp.level} value={tp.level}>
                    TP{tp.level}: {tp.tp}
                  </option>
                ))}
              </select>
              <Button
                className="bg-accent-green hover:bg-accent-green/90 text-white"
                onClick={handleTakeProfit}
                disabled={isTakingProfit || selectedTP === null}
              >
                {isTakingProfit ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Taking Profit...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Take Profit
                  </>
                )}
              </Button>
            </>
          )}

          {isActive && isAdmin && (
            <Button
              variant="destructive"
              onClick={handleStopLoss}
              disabled={isClosing}
            >
              {isClosing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Stop Loss
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeAlertCard;
