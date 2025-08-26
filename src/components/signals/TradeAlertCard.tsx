import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Clock, 
  Zap,
  User,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TradeAlertData } from '@/types/TradeAlertData';

interface TradeAlertCardProps {
  alert: TradeAlertData;
  onStatusUpdate?: (alert: TradeAlertData, newStatus: string) => void;
  onTakeProfitHit?: (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => void;
  onStopLossHit?: (alert: TradeAlertData, closeReason: string) => void;
  onOrderActivation?: (alert: TradeAlertData) => void;
  isAdmin?: boolean;
  isCreator?: boolean;
  livePrice?: number;
  connectionStatus?: 'connecting' | 'connected' | 'error';
  priceSource?: string;
  isRecentClosure?: boolean;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url: string | null;
  };
  justAdded?: boolean;
}

export default function TradeAlertCard({
  alert,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  isAdmin = false,
  isCreator = false,
  livePrice,
  connectionStatus,
  priceSource,
  isRecentClosure = false,
  creator,
  justAdded = false
}: TradeAlertCardProps) {
  const [closing, setClosing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [tpUpdating, setTpUpdating] = useState(false);
  const [slUpdating, setSlUpdating] = useState(false);
  const [showFullNotes, setShowFullNotes] = useState(false);

  const timeAgo = useMemo(() => {
    return formatDistanceToNow(new Date(alert.updated_date), { addSuffix: true });
  }, [alert.updated_date]);

  const handleClose = async () => {
    if (!onStatusUpdate) return;
    setClosing(true);
    await onStatusUpdate(alert, 'closed');
    setClosing(false);
  };

  const handleActivate = async () => {
    if (!onOrderActivation) return;
    setActivating(true);
    await onOrderActivation(alert);
    setActivating(false);
  };

  const handleTakeProfit = async (tpLevel: number) => {
    if (!onTakeProfitHit) return;
    setTpUpdating(true);
    const newTPHits = [...alert.tp_hits, tpLevel];
    await onTakeProfitHit(alert, newTPHits);
    setTpUpdating(false);
  };

  const handleStopLossHit = async () => {
    if (!onStopLossHit) return;
    setSlUpdating(true);
    await onStopLossHit(alert, 'stop_loss');
    setSlUpdating(false);
  };

  const getStatusBadge = () => {
    switch (alert.status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case 'active':
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          Active
        </Badge>;
      case 'partially_profited':
        return <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          Partially Profited
        </Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Closed
        </Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          {alert.status}
        </Badge>;
    }
  };

  const getTradeTypeBadge = () => {
    const isBuy = alert.trade_type.includes('buy');
    const color = isBuy ? 'emerald' : 'red';
    const tradeTypeText = alert.trade_type.charAt(0).toUpperCase() + alert.trade_type.slice(1);

    return (
      <Badge className={`bg-${color}-500/20 text-${color}-300 border-${color}-500/30`}>
        {isBuy ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {tradeTypeText}
      </Badge>
    );
  };

  const getPriceStatus = () => {
    if (!livePrice) {
      if (connectionStatus === 'connecting') {
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Wifi className="w-3 h-3 mr-1 animate-spin" />
          Connecting...
        </Badge>;
      } else if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
          <WifiOff className="w-3 h-3 mr-1" />
          Offline
        </Badge>;
      } else {
        return <Badge className="bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          No Price
        </Badge>;
      }
    }

    const diff = livePrice - alert.entry_price;
    const percentChange = (diff / alert.entry_price) * 100;
    const isProfitable = (alert.trade_type.includes('buy') && diff > 0) || (alert.trade_type.includes('sell') && diff < 0);
    const color = isProfitable ? 'emerald' : 'red';
  
    const formattedPercentChange = percentChange.toFixed(2);
    const formattedDiff = diff.toFixed(5);
  
    return (
      <Badge className={`bg-${color}-500/20 text-${color}-300 border-${color}-500/30`}>
        {isProfitable ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {formattedDiff} ({formattedPercentChange}%)
      </Badge>
    );
  };

  const getCreatorBadge = () => {
    if (!creator) return null;
    return (
      <div className="flex items-center space-x-2">
        {creator.avatar_url ? (
          <img src={creator.avatar_url} alt={creator.display_name} className="w-6 h-6 rounded-full" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{creator.display_name}</span>
      </div>
    );
  };

  const getTpButton = (tpLevel: number) => {
    const tpValue = (alert as any)[`tp${tpLevel}`];
    if (!tpValue) return null;

    const hasHit = alert.tp_hits.includes(tpLevel);
    const buttonColor = hasHit ? 'gray' : 'emerald';
    const textColor = hasHit ? 'muted-foreground' : `${buttonColor}-foreground`;
    const buttonText = hasHit ? `TP${tpLevel} Hit` : `Hit TP${tpLevel}`;

    return (
      <Button
        variant="outline"
        size="sm"
        className={`w-full justify-start text-left font-medium border-${buttonColor}-500 text-${textColor} hover:bg-${buttonColor}-500/10`}
        onClick={() => handleTakeProfit(tpLevel)}
        disabled={tpUpdating || hasHit}
      >
        <Target className="h-4 w-4 mr-2" />
        {buttonText} ({tpValue})
      </Button>
    );
  };

  return (
    <Card className={`w-full ${justAdded ? 'animate-in fade-in duration-700' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold">
            {alert.asset_name} ({alert.tradermade_symbol})
          </h4>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {getTradeTypeBadge()}
            {isRecentClosure ? <Badge className="bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30">
              Closed {timeAgo}
            </Badge> : <span className="text-xs text-muted-foreground">Updated {timeAgo}</span>}
          </div>
        </div>
        {getCreatorBadge()}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {livePrice && <div className="mb-2">{getPriceStatus()}</div>}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>Entry: {alert.entry_price}</div>
            <div>Stop Loss: {alert.stop_loss}</div>
          </div>

          {getTpButton(1)}
          {getTpButton(2)}
          {getTpButton(3)}
          {getTpButton(4)}
          {getTpButton(5)}

          {alert.notes && (
            <div className="mt-4">
              <h5 className="mb-1 font-medium">Notes:</h5>
              {showFullNotes ? (
                <p className="whitespace-pre-line">{alert.notes}</p>
              ) : (
                <>
                  <p className="line-clamp-3 whitespace-pre-line">{alert.notes}</p>
                  {alert.notes.length > 100 && (
                    <Button variant="link" size="sm" onClick={() => setShowFullNotes(true)}>
                      Show More
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4 space-x-2">
          {alert.status === 'pending' && isCreator && onStatusUpdate && (
            <Button variant="outline" size="sm" disabled={activating} onClick={handleActivate}>
              {activating ? (
                <>
                  <Play className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Activate Order
                </>
              )}
            </Button>
          )}
          {alert.status === 'active' && (isAdmin || isCreator) && onStatusUpdate && (
            <>
              <Button variant="outline" size="sm" disabled={slUpdating} onClick={handleStopLossHit}>
                {slUpdating ? (
                  <>
                    <Pause className="mr-2 h-4 w-4 animate-spin" />
                    Closing SL...
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Stop Loss Hit
                  </>
                )}
              </Button>
              <Button variant="destructive" size="sm" disabled={closing} onClick={handleClose}>
                {closing ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Signal
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
