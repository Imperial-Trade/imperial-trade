import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Target, TrendingUp, XCircle } from 'lucide-react';

interface NotificationBadgeProps {
  type: 'new_signal' | 'tp_hit' | 'stop_loss' | 'trade_closed' | 'limit_activated' | 'notes_updated' | 'manual_close';
  priority?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ type, priority = 1 }) => {
  const badgeConfig = {
    new_signal: {
      label: 'New Signal',
      icon: <TrendingUp className="h-3 w-3" />,
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    },
    tp_hit: {
      label: 'TP Hit',
      icon: <Target className="h-3 w-3" />,
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
    },
    stop_loss: {
      label: 'Stop Loss',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-500/20 text-red-400 border-red-500/50'
    },
    trade_closed: {
      label: 'Closed',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-500/20 text-green-400 border-green-500/50'
    },
    limit_activated: {
      label: 'Activated',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    },
    notes_updated: {
      label: 'Updated',
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    },
    manual_close: {
      label: 'Manual Close',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    }
  };

  const config = badgeConfig[type] || badgeConfig.new_signal;

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      <span className="text-xs font-medium">{config.label}</span>
      {priority > 2 && <span className="ml-1 text-xs">🔥</span>}
    </Badge>
  );
};

export default NotificationBadge;
