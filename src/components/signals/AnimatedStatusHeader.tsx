import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { User, Crown, GraduationCap } from 'lucide-react';
import TradeStatusBadge from './TradeStatusBadge';

interface Creator {
  id: string;
  display_name: string;
  role: string;
  avatar_url?: string;
}

interface Alert {
  id: string;
  asset_name: string;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  trade_type?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  tp_hits?: number[];
  close_reason?: string;
  created_date: string;
  updated_date?: string;
}

interface AnimatedStatusHeaderProps {
  creator?: Creator;
  alert: Alert;
  isRecentClosure?: boolean;
  justAdded?: boolean;
}

const AnimatedStatusHeader: React.FC<AnimatedStatusHeaderProps> = ({
  creator,
  alert,
  isRecentClosure,
  justAdded = false
}) => {
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Crown className="w-4 h-4 text-accent-gold" />;
      case 'educator':
        return <GraduationCap className="w-4 h-4 text-accent-blue" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-accent-gold/20 text-accent-gold border-accent-gold/30';
      case 'educator':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="mb-2">
      {/* Signal Creator Attribution */}
      {creator && (
        <div className="flex items-start justify-between mb-2 pb-2 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            {getRoleIcon(creator.role)}
            <span className="text-sm font-semibold text-foreground">{creator.display_name}</span>
            <Badge className={`text-xs ${getRoleBadgeClass(creator.role)}`}>
              {creator.role.charAt(0).toUpperCase() + creator.role.slice(1)}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-xs text-muted-foreground">
              {formatTimeAgo(alert.created_date)}
            </div>
          </div>
        </div>
      )}

      {/* Currency Pair and Status - Decoupled from price updates */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold">{alert.asset_name}</h3>
            <TradeStatusBadge 
              alert={alert} 
              updatedDate={alert.updated_date} 
              isRecentClosure={isRecentClosure} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(AnimatedStatusHeader, (prevProps, nextProps) => {
  // Only re-render if essential display properties change
  // Specifically exclude any price-related changes
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.asset_name === nextProps.alert.asset_name &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.close_reason === nextProps.alert.close_reason &&
    JSON.stringify(prevProps.alert.tp_hits) === JSON.stringify(nextProps.alert.tp_hits) &&
    prevProps.creator?.id === nextProps.creator?.id &&
    prevProps.creator?.display_name === nextProps.creator?.display_name &&
    prevProps.creator?.role === nextProps.creator?.role &&
    prevProps.isRecentClosure === nextProps.isRecentClosure &&
    prevProps.justAdded === nextProps.justAdded
  );
});