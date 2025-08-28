
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { TradeAlertWithProfile } from '@/types/trading';

export interface LimitOrderStatusProps {
  signal: TradeAlertWithProfile;
  currentPrice?: number;
}

export const LimitOrderStatus: React.FC<LimitOrderStatusProps> = ({ signal, currentPrice }) => {
  const isLimitOrder = signal.tradeType === 'buy_limit' || signal.tradeType === 'sell_limit';
  
  if (!isLimitOrder) {
    return null;
  }

  const getOrderStatus = () => {
    if (signal.status === 'active') {
      return {
        icon: CheckCircle,
        text: 'Order Activated',
        variant: 'default' as const,
        className: 'bg-green-500/10 text-green-600 border-green-500/20'
      };
    }

    if (signal.status === 'pending') {
      return {
        icon: Clock,
        text: 'Awaiting Trigger',
        variant: 'outline' as const,
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      };
    }

    if (signal.status === 'closed') {
      return {
        icon: AlertCircle,
        text: 'Order Closed',
        variant: 'outline' as const,
        className: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
      };
    }

    return {
      icon: AlertCircle,
      text: signal.status,
      variant: 'outline' as const,
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    };
  };

  const { icon: Icon, text, variant, className } = getOrderStatus();

  const getTriggerInfo = () => {
    if (!currentPrice || signal.status !== 'pending') return null;

    const entryPrice = signal.entryPrice;
    const isBuyLimit = signal.tradeType === 'buy_limit';
    
    // Calculate distance to trigger
    const distance = isBuyLimit 
      ? ((currentPrice - entryPrice) / entryPrice * 100)
      : ((entryPrice - currentPrice) / entryPrice * 100);
    
    const triggerDirection = isBuyLimit ? 'drop to' : 'rise to';
    const isClose = Math.abs(distance) < 1; // Within 1%

    return {
      distance: Math.abs(distance),
      triggerDirection,
      isClose
    };
  };

  const triggerInfo = getTriggerInfo();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={variant} className={className}>
          <Icon className="h-3 w-3 mr-1" />
          {text}
        </Badge>
        
        {signal.status === 'active' && signal.activated_at && (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            <Zap className="h-3 w-3 mr-1" />
            Activated
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div>Entry Target: ${signal.entryPrice.toFixed(4)}</div>
        
        {currentPrice && (
          <div>Current: ${currentPrice.toFixed(4)}</div>
        )}
        
        {triggerInfo && (
          <div className={`${triggerInfo.isClose ? 'text-orange-600 font-medium' : ''}`}>
            Needs to {triggerInfo.triggerDirection} ${signal.entryPrice.toFixed(4)}
            {triggerInfo.isClose && ' (Close!)'}
          </div>
        )}
        
        {signal.activated_at && (
          <div className="text-green-600">
            Activated: {new Date(signal.activated_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};
