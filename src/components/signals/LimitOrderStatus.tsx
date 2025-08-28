
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
        text: 'Order Triggered',
        variant: 'default' as const,
        className: 'bg-green-500/10 text-green-600 border-green-500/20'
      };
    }

    if (signal.status === 'pending') {
      return {
        icon: Clock,
        text: 'Pending Trigger',
        variant: 'outline' as const,
        className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
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

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {text}
      </Badge>
      {currentPrice && (
        <span className="text-xs text-muted-foreground">
          Current: ${currentPrice.toFixed(2)}
        </span>
      )}
    </div>
  );
};
