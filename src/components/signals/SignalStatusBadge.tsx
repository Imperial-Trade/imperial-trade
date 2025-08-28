
import { Badge } from '@/components/ui/badge';

interface SignalStatusBadgeProps {
  status: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
  className?: string;
}

export const SignalStatusBadge = ({ status, className }: SignalStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      case 'active':
        return {
          label: 'Active',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'partially_profited':
        return {
          label: 'Partial Profit',
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'closed':
        return {
          label: 'Closed',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {config.label}
    </Badge>
  );
};
