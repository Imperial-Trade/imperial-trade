
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X, Target, TrendingUp, Hourglass, Clock } from 'lucide-react';
import { mapStatusToVariant, getTpHitVariant } from '@/utils/trading-ui';
import { TradeAlertStatus, TradeAlertCloseReason } from '@/types/trading';

interface TradeStatusBadgeProps {
  alert: {
    status: TradeAlertStatus;
    trade_type?: string;
    tp_hits?: number[];
    close_reason?: TradeAlertCloseReason | string | null;
  };
  updatedDate?: string;
  isRecentClosure?: boolean;
}

export default function TradeStatusBadge({ alert, updatedDate, isRecentClosure }: TradeStatusBadgeProps) {
    const hitTPs = alert.tp_hits || [];
    const tradeType = alert.trade_type;
    const isLimitType = tradeType === 'buy_limit' || tradeType === 'sell_limit';
    
    // Get friendly type for limit orders
    const getFriendlyType = () => {
        if (tradeType === 'buy_limit') return 'Buy Limit';
        if (tradeType === 'sell_limit') return 'Sell Limit';
        if (tradeType === 'buy') return 'Buy';
        if (tradeType === 'sell') return 'Sell';
        return undefined;
    };

    // Icon mapping to React components
    const iconMap = {
        hourglass: Hourglass,
        target: Target,
        'trending-up': TrendingUp,
        check: Check,
        x: X,
        clock: Clock
    };

    // Handle partially_profited with dual badges
    if (alert.status === 'partially_profited') {
        const partialVariant = mapStatusToVariant(alert.status, alert.close_reason, hitTPs);
        const highestTP = hitTPs.length > 0 ? Math.max(...hitTPs) : 1;
        const tpVariant = getTpHitVariant(highestTP, 'partial');
        
        const PartialIcon = iconMap[partialVariant.iconKey];
        const TpIcon = iconMap[tpVariant.iconKey];

        return (
            <div className="flex items-center gap-2">
                <Badge className={`${partialVariant.className} whitespace-nowrap uppercase`}>
                    <PartialIcon className="w-3 h-3 mr-1" /> {partialVariant.label}
                </Badge>
                <Badge className={`${tpVariant.className} uppercase whitespace-nowrap`}>
                    TP{highestTP} HIT
                </Badge>
            </div>
        );
    }

    // Handle active with TP hits (dual badges)
    if (alert.status === 'active' && hitTPs.length > 0) {
        const highestTP = Math.max(...hitTPs);
        const tpVariant = getTpHitVariant(highestTP, 'active');
        const activeVariant = mapStatusToVariant(alert.status, alert.close_reason, hitTPs);
        
        const TpIcon = iconMap[tpVariant.iconKey];
        const ActiveIcon = iconMap[activeVariant.iconKey];
        
        const friendlyType = getFriendlyType();
        const activeText = isLimitType && friendlyType ? `Active ${friendlyType}` : 'Active';

        return (
            <div className="flex items-center gap-2">
                <Badge className={`${tpVariant.className} animate-pulse whitespace-nowrap uppercase`}>
                    <TpIcon className="w-3 h-3 mr-1" /> TP{highestTP} HIT
                </Badge>
                <Badge className={`${activeVariant.className} uppercase whitespace-nowrap`}>
                    {activeText}
                </Badge>
            </div>
        );
    }

    // Single badge for all other states
    const variant = mapStatusToVariant(alert.status, alert.close_reason, hitTPs);
    const Icon = iconMap[variant.iconKey];
    
    // Handle pending with trade type
    if (alert.status === 'pending') {
        const friendlyType = getFriendlyType();
        const pendingText = isLimitType && friendlyType ? `Pending ${friendlyType}` : variant.label;
        
        return (
            <Badge className={`${variant.className} uppercase`}>
                <Icon className="w-3 h-3 mr-1 animate-spin" /> {pendingText}
            </Badge>
        );
    }

    // Handle active without TP hits
    if (alert.status === 'active') {
        const friendlyType = getFriendlyType();
        const activeText = isLimitType && friendlyType ? `Active ${friendlyType}` : variant.label;
        
        return (
            <Badge className={variant.className}>
                <Icon className="w-3 h-3 mr-1" /> {activeText}
            </Badge>
        );
    }

    // Handle closed states
    return (
        <Badge className={variant.className}>
            <Icon className="w-4 h-4 mr-1" /> {variant.label}
        </Badge>
    );
}
