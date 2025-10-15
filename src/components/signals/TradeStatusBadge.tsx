
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X, Target, TrendingUp, Hourglass, XCircle } from 'lucide-react';

interface TradeStatusBadgeProps {
  alert: {
    status: 'pending' | 'active' | 'closed' | 'partially_profited';
    trade_type?: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
    tp_hits?: number[];
    close_reason?: string;
  };
  updatedDate?: string;
  isRecentClosure?: boolean;
}

export default function TradeStatusBadge({ alert, updatedDate, isRecentClosure }: TradeStatusBadgeProps) {
    const hitTPs = alert.tp_hits || [];
    const isActive = alert.status === 'active' || alert.status === 'partially_profited';
    const isPending = alert.status === 'pending';
    const closeReason = alert.close_reason;
    const isClosed = alert.status === 'closed';
    const tradeType = alert.trade_type;
    const friendlyType =
      tradeType === 'buy_limit' ? 'Buy Limit' :
      tradeType === 'sell_limit' ? 'Sell Limit' :
      tradeType === 'buy' ? 'Buy' :
      tradeType === 'sell' ? 'Sell' : undefined;
    const isLimitType = tradeType === 'buy_limit' || tradeType === 'sell_limit';
    
    // Determine if it's a sell type for color coding
    const isSellType = tradeType === 'sell' || tradeType === 'sell_limit';
    const typeLabel = tradeType === 'buy' ? 'Buy' : tradeType === 'sell' ? 'Sell' : 
                     tradeType === 'buy_limit' ? 'Buy' : tradeType === 'sell_limit' ? 'Sell' : 'Trade';

    if (isPending) {
        const pendingText = isLimitType && friendlyType ? `Pending ${friendlyType}` : 'Pending';
        return (
            <Badge className="bg-gold-light/20 text-gold-warm border border-gold-warm/30 uppercase text-xs px-2 py-0.5" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                <Hourglass className="w-2.5 h-2.5 mr-0.5" /> {pendingText}
            </Badge>
        );
    }

    if (isActive && hitTPs.length > 0) {
        const highestTP = Math.max(...hitTPs);
        const activeText = `ACTIVE ${typeLabel.toUpperCase()}`;
        const tpBadgeColors = 'bg-transparent border text-emerald-600 border-emerald-600';
        const activeBadgeColors = isSellType ? 'bg-transparent border text-red-600 border-red-600' : 'bg-transparent border text-emerald-600 border-emerald-600';
        return (
            <div className="flex items-center gap-1.5">
                <Badge className={`${tpBadgeColors} whitespace-nowrap uppercase text-xs px-1.5 py-0.5`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                    <Target className="w-2.5 h-2.5 mr-0.5" /> TP{highestTP} HIT
                </Badge>
                <Badge className={`${activeBadgeColors} uppercase whitespace-nowrap text-xs px-1.5 py-0.5`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                    {activeText}
                </Badge>
            </div>
        );
    }

    if (isActive) {
        const activeText = isLimitType ? 
            `ACTIVE ${friendlyType?.toUpperCase() || typeLabel.toUpperCase()}` : 
            `ACTIVE ${typeLabel.toUpperCase()}`;
        const badgeColors = isSellType ? 'bg-transparent border text-red-600 border-red-600' : 'bg-transparent border text-emerald-600 border-emerald-600';
        return (
            <Badge className={`${badgeColors} text-xs px-1.5 py-0.5`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
                {activeText}
            </Badge>
        );
    }

    if (isClosed) {
        // ✅ PRIORITY 1: Manual close takes highest priority
        if (closeReason === 'manual') {
            return (
                <Badge className="bg-transparent border text-gray-500 border-gray-500 text-xs px-1.5 py-0.5">
                    <XCircle className="w-2.5 h-2.5 mr-0.5" />
                    MANUALLY CLOSED
                </Badge>
            );
        }
        
        // ✅ PRIORITY 2: If ANY TPs hit, show highest TP (even if SL triggered after)
        if (hitTPs.length > 0) {
            const highestTP = Math.max(...hitTPs);
            return (
                <Badge className="bg-transparent border text-emerald-600 border-emerald-600 text-xs px-1.5 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    TP{highestTP} HIT
                </Badge>
            );
        }
        
        // ✅ PRIORITY 3: Stop loss ONLY if NO TPs were hit
        if (closeReason === 'stop_loss') {
            return (
                <Badge className="bg-transparent border text-red-600 border-red-600 text-xs px-1.5 py-0.5">
                    <X className="w-2.5 h-2.5 mr-0.5" /> STOP LOSS HIT
                </Badge>
            );
        }
        
        // ✅ PRIORITY 4: All TPs hit (final take profit)
        if (closeReason && closeReason.startsWith('tp')) {
            const tpNumber = closeReason.replace('tp', '').replace('_hit', '');
            return (
                <Badge className="bg-transparent border text-emerald-600 border-emerald-600 text-xs px-1.5 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    TP{tpNumber} HIT
                </Badge>
            );
        }
        
        // ✅ FALLBACK: Generic "CLOSED" badge
        return (
            <Badge className="bg-transparent border text-gray-500 border-gray-500 text-xs px-1.5 py-0.5">
                CLOSED
            </Badge>
        );
    }

    return null;
}
