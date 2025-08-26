import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Shield, 
  Copy, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Wifi,
  WifiOff,
  User,
  Crown,
  GraduationCap
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface TradeAlertData {
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
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp';
  created_date: string | Date;
  updated_date: string | Date;
}

export interface Creator {
  id: string;
  display_name: string;
  role: string;
  avatar_url?: string;
  user_type?: string;
  access_level?: string;
}

interface TradeAlertCardProps {
  alert: TradeAlertData;
  onStatusUpdate?: (alert: TradeAlertData, newStatus: string) => void;
  onTakeProfitHit?: (alert: TradeAlertData, tpHits: number[], shouldClose?: boolean, closeReason?: string) => void;
  onStopLossHit?: (alert: TradeAlertData, closeReason: string) => void;
  onOrderActivation?: (alert: TradeAlertData) => void;
  isAdmin?: boolean;
  isCreator?: boolean;
  livePrice?: number;
  connectionStatus?: 'connecting' | 'connected' | 'error';
  priceSource?: string;
  isRecentClosure?: boolean;
  creator?: Creator;
  justAdded?: boolean;
}

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  });
};

export default function TradeAlertCard({
  alert,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  isAdmin = false,
  isCreator = false,
  livePrice,
  connectionStatus = 'error',
  priceSource,
  isRecentClosure = false,
  creator,
  justAdded = false
}: TradeAlertCardProps) {
  const [copying, setCopying] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  
  const isActive = alert.status === 'active' || alert.status === 'partially_profited';
  const isPending = alert.status === 'pending';
  const isClosed = alert.status === 'closed';
  const isPartiallyProfited = alert.status === 'partially_profited';
  
  const isBuyOrder = alert.trade_type.includes('buy');
  const isSellOrder = alert.trade_type.includes('sell');
  const isLimitOrder = alert.trade_type.includes('limit');
  
  // Price calculations
  const currentPrice = livePrice || alert.entry_price;
  const pipsInProgress = useMemo(() => {
    if (!isActive || !livePrice) return 0;
    const diff = livePrice - alert.entry_price;
    return isBuyOrder ? diff : -diff;
  }, [livePrice, alert.entry_price, isBuyOrder, isActive]);
  
  const distanceToEntry = useMemo(() => {
    if (!isPending || !livePrice) return 0;
    return Math.abs(livePrice - alert.entry_price);
  }, [livePrice, alert.entry_price, isPending]);
  
  // TP levels and hit status
  const tpLevels = useMemo(() => {
    const levels = [];
    for (let i = 1; i <= 5; i++) {
      const tpKey = `tp${i}` as keyof TradeAlertData;
      const tpValue = alert[tpKey] as number;
      if (tpValue) {
        levels.push({
          level: i,
          price: tpValue,
          isHit: alert.tp_hits.includes(i),
          pips: isBuyOrder ? tpValue - alert.entry_price : alert.entry_price - tpValue
        });
      }
    }
    return levels;
  }, [alert, isBuyOrder]);
  
  const getStatusBadge = () => {
    switch (alert.status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'active':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'partially_profited':
        return (
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Partially Profited
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return null;
    }
  };
  
  const getCreatorIcon = () => {
    if (!creator) return <User className="w-4 h-4" />;
    
    if (creator.access_level === 'admin' || creator.role === 'admin') {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    }
    
    if (creator.user_type === 'educator' || creator.access_level === 'moderator' || creator.role === 'educator') {
      return <GraduationCap className="w-4 h-4 text-blue-500" />;
    }
    
    return <User className="w-4 h-4" />;
  };
  
  const copyTradeDetails = useCallback(async () => {
    setCopying(true);
    try {
      const details = [
        `${alert.asset_name} ${alert.trade_type.toUpperCase()}`,
        `Entry: ${alert.entry_price}`,
        `Stop Loss: ${alert.stop_loss}`,
        ...tpLevels.map(tp => `TP${tp.level}: ${tp.price}`),
        livePrice ? `Current Price: ${livePrice}` : '',
        creator ? `By: ${creator.display_name}` : ''
      ].filter(Boolean).join('\n');
      
      await navigator.clipboard.writeText(details);
      
      // Show success notification if available
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'success',
          title: 'Copied!',
          message: 'Trade details copied to clipboard'
        });
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    } finally {
      setCopying(false);
    }
  }, [alert, tpLevels, livePrice, creator]);
  
  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };
  
  const canInteract = (isCreator || isAdmin) && !isClosed;
  
  return (
    <Card className={cn(
      "relative transition-all duration-300 hover:shadow-lg border-border bg-background",
      justAdded && "ring-2 ring-accent-green/50 animate-pulse",
      isRecentClosure && "opacity-75",
      isClosed && "bg-muted/30"
    )}>
      {justAdded && (
        <div className="absolute -top-2 -right-2 bg-accent-green text-background text-xs px-2 py-1 rounded-full animate-bounce">
          New!
        </div>
      )}
      
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-full",
              isBuyOrder ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {isBuyOrder ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{alert.asset_name}</h3>
              <p className="text-sm text-muted-foreground">
                {alert.trade_type.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
        
        {/* Creator Info */}
        {creator && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Avatar className="w-6 h-6">
              {creator.avatar_url ? (
                <AvatarImage src={creator.avatar_url} alt={creator.display_name} />
              ) : (
                <AvatarFallback className="text-xs">
                  {creator.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="flex items-center space-x-1">
              {getCreatorIcon()}
              <span>{creator.display_name}</span>
            </span>
          </div>
        )}
        
        {/* Price Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="font-mono font-semibold">{alert.entry_price}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {isPending ? 'Distance to Entry' : 'Current Price'}
            </p>
            <div className="flex items-center space-x-2">
              <p className="font-mono font-semibold">
                {isPending ? distanceToEntry.toFixed(5) : (livePrice || alert.entry_price)}
              </p>
              {connectionStatus === 'connected' && livePrice && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                  Live
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Pips Progress / Distance */}
        {isActive && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pips in Progress</p>
            <div className="flex items-center space-x-2">
              <p className={cn(
                "font-mono font-semibold text-lg",
                pipsInProgress >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {pipsInProgress >= 0 ? '+' : ''}{(pipsInProgress * 10000).toFixed(1)}
              </p>
              <Badge variant="outline" className={cn(
                "text-xs",
                pipsInProgress >= 0 
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              )}>
                {pipsInProgress >= 0 ? 'Profit' : 'Loss'}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Stop Loss */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Stop Loss</p>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-red-400" />
            <p className="font-mono">{alert.stop_loss}</p>
          </div>
        </div>
        
        {/* Take Profit Levels */}
        {tpLevels.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Take Profit Levels</p>
            <div className="grid grid-cols-1 gap-2">
              {tpLevels.map(tp => (
                <div key={tp.level} className={cn(
                  "flex items-center justify-between p-2 rounded border",
                  tp.isHit 
                    ? "bg-green-500/20 border-green-500/30 text-green-400"
                    : "bg-muted/50 border-border"
                )}>
                  <div className="flex items-center space-x-2">
                    <Target className="w-3 h-3" />
                    <span className="text-sm font-medium">TP{tp.level}</span>
                    <span className="font-mono text-sm">{tp.price}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {(tp.pips * 10000).toFixed(1)} pips
                    </span>
                    {tp.isHit && <CheckCircle className="w-4 h-4 text-green-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Notes */}
        {alert.notes && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm bg-muted/50 p-2 rounded border">{alert.notes}</p>
          </div>
        )}
        
        {/* Close Reason */}
        {isClosed && alert.close_reason && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Close Reason</p>
            <Badge variant="outline" className="bg-muted/50">
              {alert.close_reason.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        )}
        
        <Separator />
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>{formatTime(alert.created_date)}</span>
            {priceSource && (
              <span>via {priceSource}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyTradeDetails}
              disabled={copying}
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copying ? 'Copying...' : 'Copy Details'}
            </Button>
            
            {/* Action buttons for creators/admins */}
            {canInteract && (
              <>
                {isPending && isLimitOrder && onOrderActivation && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOrderActivation(alert)}
                    className="text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    Activate
                  </Button>
                )}
                
                {isActive && onStatusUpdate && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusUpdate(alert, 'closed')}
                    className="text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Close
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
