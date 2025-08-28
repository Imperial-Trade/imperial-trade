
import { Badge } from '@/components/ui/badge';

interface TradeStatusBadgeProps {
  alert: {
    status: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
    trade_type?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    close_reason?: string;
  };
  updatedDate: string;
  isRecentClosure?: boolean;
  className?: string;
}

export const TradeStatusBadge = ({ alert, updatedDate, isRecentClosure, className }: TradeStatusBadgeProps) => {
  const getStatusConfig = () => {
    const isSellOrder = alert.trade_type === 'sell' || alert.trade_type === 'sell_limit';
    
    switch (alert.status) {
      case 'pending':
        return {
          label: 'Pending Order',
          variant: 'secondary' as const,
          className: 'bg-accent-gold/20 text-accent-gold border-accent-gold/30 animate-pulse'
        };
      case 'active':
        return {
          label: 'Live Signal',
          variant: 'default' as const,
          className: isSellOrder 
            ? 'bg-accent-red/20 text-accent-red border-accent-red/30 animate-pulse'
            : 'bg-accent-green/20 text-accent-green border-accent-green/30 animate-pulse'
        };
      case 'partially_profited':
        return {
          label: 'Partial Profit',
          variant: 'default' as const,
          className: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
        };
      case 'closed':
        const closeReason = alert.close_reason;
        let label = 'Closed';
        let colorClass = 'bg-muted/20 text-muted-foreground border-border/30';
        
        if (closeReason === 'stop_loss') {
          label = 'Stop Loss Hit';
          colorClass = 'bg-accent-red/20 text-accent-red border-accent-red/30';
        } else if (closeReason?.startsWith('tp') || closeReason === 'all_tps_hit') {
          label = 'Take Profit Hit';
          colorClass = 'bg-accent-green/20 text-accent-green border-accent-green/30';
        } else if (closeReason === 'manual') {
          label = 'Manually Closed';
        }
        
        return {
          label,
          variant: 'outline' as const,
          className: colorClass
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-accent-red/20 text-accent-red border-accent-red/30'
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-muted/20 text-muted-foreground border-border/30'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge 
        variant={config.variant}
        className={`${config.className} ${className || ''} transition-all duration-300`}
      >
        {config.label}
      </Badge>
      <div className="text-xs text-muted-foreground">
        {new Date(updatedDate).toLocaleDateString()}
      </div>
    </div>
  );
};

export default TradeStatusBadge;
