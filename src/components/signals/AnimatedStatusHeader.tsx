import React, { memo } from 'react';
import { Crown } from 'lucide-react';
import TradeStatusBadge from './TradeStatusBadge';

interface Creator {
  id: string;
  display_name: string;
  role: string;
  avatar_url?: string;
}

// PHASE C: Minimal primitive props for isolated animations
interface AnimatedStatusHeaderProps {
  creator?: Creator;
  // Primitive props only - no complex objects
  assetName: string;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tradeType?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  closeReason?: string;
  highestTP?: number | null;
  hasTPHits: boolean;
  isRecentClosure?: boolean;
  justAdded?: boolean;
  createdDate: string;
  updatedDate?: string;
  // Action icons
  actionIcons?: React.ReactNode;
}

const AnimatedStatusHeader: React.FC<AnimatedStatusHeaderProps> = ({
  creator,
  assetName,
  status,
  tradeType,
  closeReason,
  highestTP,
  hasTPHits,
  isRecentClosure,
  justAdded = false,
  createdDate,
  updatedDate,
  actionIcons
}) => {
  const getRoleDisplay = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('educator') && (roleLower.includes('plus') || roleLower.includes('+'))) {
      return 'Educator+';
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
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
            <Crown className="w-4 h-4 text-accent-gold" />
            <span className="text-sm font-semibold text-foreground">{creator.display_name}</span>
            <span className="text-xs text-muted-foreground">
              {getRoleDisplay(creator.role)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-xs text-muted-foreground">
              {status === 'closed' && updatedDate 
                ? formatTimeAgo(updatedDate) 
                : formatTimeAgo(createdDate)
              }
            </div>
          </div>
        </div>
      )}

      {/* Currency Pair and Status - Decoupled from price updates */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold">{assetName}</h3>
            <TradeStatusBadge 
              alert={{ status, trade_type: tradeType, tp_hits: hasTPHits ? [highestTP || 1] : [], close_reason: closeReason }} 
              updatedDate={updatedDate} 
              isRecentClosure={isRecentClosure} 
            />
          </div>
        </div>
        {actionIcons && (
          <div className="flex items-center gap-1">
            {actionIcons}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AnimatedStatusHeader, (prevProps, nextProps) => {
  // PHASE C: Shallow compare of primitive props only - no complex objects
  return (
    prevProps.assetName === nextProps.assetName &&
    prevProps.status === nextProps.status &&
    prevProps.tradeType === nextProps.tradeType &&
    prevProps.closeReason === nextProps.closeReason &&
    prevProps.highestTP === nextProps.highestTP &&
    prevProps.hasTPHits === nextProps.hasTPHits &&
    prevProps.creator?.id === nextProps.creator?.id &&
    prevProps.creator?.display_name === nextProps.creator?.display_name &&
    prevProps.creator?.role === nextProps.creator?.role &&
    prevProps.isRecentClosure === nextProps.isRecentClosure &&
    prevProps.justAdded === nextProps.justAdded &&
    prevProps.createdDate === nextProps.createdDate &&
    prevProps.updatedDate === nextProps.updatedDate
  );
});