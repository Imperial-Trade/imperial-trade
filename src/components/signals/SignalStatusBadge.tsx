
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, CheckCircle, XCircle, Pause } from 'lucide-react';

interface SignalStatusBadgeProps {
  status: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
  tradeType?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
}

export const SignalStatusBadge = ({ status, tradeType }: SignalStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'active':
        return {
          icon: TrendingUp,
          text: 'Active',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'partially_profited':
        return {
          icon: TrendingUp,
          text: 'Partial TP',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'closed':
        return {
          icon: CheckCircle,
          text: 'Closed',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          text: 'Cancelled',
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          icon: Pause,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Apply red styling for sell orders
  const isRedOrder = tradeType === 'sell' || tradeType === 'sell_limit';
  const finalClassName = isRedOrder 
    ? config.className.replace('green-', 'red-').replace('blue-', 'red-').replace('amber-', 'red-')
    : config.className;

  return (
    <Badge className={`${finalClassName} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};
