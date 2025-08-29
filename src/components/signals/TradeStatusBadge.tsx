
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X, Target, TrendingUp, Hourglass } from 'lucide-react';

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

    if (isPending) {
        const pendingText = isLimitType && friendlyType ? `Pending ${friendlyType}` : 'Pending';
        return (
            <Badge className="bg-gold-light/20 text-gold-warm border border-gold-warm/30 uppercase text-xs px-2 py-0.5">
                <Hourglass className="w-2.5 h-2.5 mr-0.5 animate-spin" /> {pendingText}
            </Badge>
        );
    }

    if (isActive && hitTPs.length > 0) {
        const highestTP = Math.max(...hitTPs);
        const activeText = isLimitType && friendlyType ? `Active ${friendlyType}` : 'Active';
        return (
            <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-emerald-400 border-emerald-400 animate-pulse whitespace-nowrap uppercase text-xs px-1.5 py-0.5">
                    <Target className="w-2.5 h-2.5 mr-0.5" /> TP{highestTP} HIT
                </Badge>
                <Badge variant="outline" className="text-emerald-400 border-emerald-400 uppercase whitespace-nowrap text-xs px-1.5 py-0.5">
                    {activeText}
                </Badge>
            </div>
        );
    }

    if (isActive) {
        const activeText = isLimitType && friendlyType ? `Active ${friendlyType}` : 'Active';
        return (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400 text-xs px-1.5 py-0.5">
                {activeText}
            </Badge>
        );
    }

    if (isClosed) {
        if (closeReason === 'stop_loss') {
            return (
                <Badge className="bg-red-500/30 text-red-200 border-red-400 shadow-lg shadow-red-500/50 border-2 text-xs px-1.5 py-0.5">
                    <X className="w-2.5 h-2.5 mr-0.5" /> STOP LOSS HIT
                </Badge>
            );
        }

        if (closeReason && closeReason.startsWith('tp')) {
            const tpNumber = closeReason.replace('tp', '');
            return (
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2 text-xs px-1.5 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    TP{tpNumber} REACHED
                </Badge>
            );
        }

        if (hitTPs.length > 0) {
            const highestTP = Math.max(...hitTPs);
            return (
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2 text-xs px-1.5 py-0.5">
                    <Check className="w-2.5 h-2.5 mr-0.5" />
                    TP{highestTP} HIT
                </Badge>
            );
        }

        return (
            <Badge className="bg-gray-600/30 text-gray-300 border-gray-500 shadow-lg shadow-gray-500/30 border-2 text-xs px-1.5 py-0.5">
                <X className="w-2.5 h-2.5 mr-0.5" />
                MANUALLY CLOSED
            </Badge>
        );
    }

    return null;
}
