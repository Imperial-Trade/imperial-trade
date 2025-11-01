
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';

interface SignalStatusBadgeProps {
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  className?: string;
}

export const SignalStatusBadge = ({ status, className }: SignalStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          variant: 'outline' as const,
          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
        };
      case 'active':
        return {
          icon: TrendingUp,
          text: 'Active',
          variant: 'outline' as const,
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        };
      case 'partially_profited':
        return {
          icon: TrendingUp,
          text: 'Partially Profited',
          variant: 'outline' as const,
          className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
        };
      case 'closed':
        return {
          icon: CheckCircle,
          text: 'Closed',
          variant: 'outline' as const,
          className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
        };
      default:
        return {
          icon: XCircle,
          text: status,
          variant: 'outline' as const,
          className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
        };
    }
  };

  const { icon: Icon, text, variant, className: statusClassName } = getStatusConfig();

  return (
    <Badge variant={variant} className={`${statusClassName} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {text}
    </Badge>
  );
};
