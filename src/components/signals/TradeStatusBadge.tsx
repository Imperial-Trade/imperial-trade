
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TradeStatusBadgeProps {
  alert: {
    status: 'pending' | 'active' | 'closed' | 'partially_profited';
    trade_type?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    tp_hits?: number[];
    close_reason?: string;
  };
  updatedDate?: string;
  isRecentClosure?: boolean;
  className?: string;
}

const TradeStatusBadge: React.FC<TradeStatusBadgeProps> = ({
  alert,
  updatedDate,
  isRecentClosure,
  className
}) => {
  const getStatusConfig = () => {
    switch (alert.status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-100 text-amber-800 border-amber-300',
          text: 'Pending'
        };
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          text: 'Active'
        };
      case 'partially_profited':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-300',
          text: 'Partial TP'
        };
      case 'closed':
        return {
          variant: 'outline' as const,
          className: 'bg-slate-100 text-slate-700 border-slate-300',
          text: 'Closed'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-slate-100 text-slate-700 border-slate-300',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.text}
    </Badge>
  );
};

export default TradeStatusBadge;
