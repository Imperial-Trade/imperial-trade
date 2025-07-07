import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X, Target, TrendingUp, Hourglass } from 'lucide-react';

export default function TradeStatusBadge({ alert, updatedDate, isRecentClosure }) {
    const hitTPs = alert.tp_hits || [];
    const isActive = alert.status === 'active';
    const isPending = alert.status === 'pending';
    const closeReason = alert.close_reason;
    const isClosed = alert.status === 'closed';

    if (isPending) {
        return (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                <Hourglass className="w-3 h-3 mr-1 animate-spin" /> Pending
            </Badge>
        );
    }

    if (isActive && hitTPs.length > 0) {
        const highestTP = Math.max(...hitTPs);
        return (
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-400 border-emerald-400 animate-pulse">
                    <Target className="w-3 h-3 mr-1" /> TP{highestTP} Hit
                </Badge>
                <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                    Active
                </Badge>
            </div>
        );
    }

    if (isActive) {
        return (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                Active
            </Badge>
        );
    }

    if (isClosed) {
        if (closeReason === 'stop_loss') {
            return (
                <Badge className="bg-red-500/30 text-red-200 border-red-400 shadow-lg shadow-red-500/50 border-2">
                    <X className="w-4 h-4 mr-1" /> STOP LOSS HIT
                </Badge>
            );
        }

        if (closeReason && closeReason.startsWith('tp')) {
            const tpNumber = closeReason.replace('tp', '');
            return (
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    TP{tpNumber} REACHED
                </Badge>
            );
        }

        if (hitTPs.length > 0) {
            const highestTP = Math.max(...hitTPs);
            return (
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/50 border-2">
                    <Check className="w-4 h-4 mr-1" />
                    TP{highestTP} HIT
                </Badge>
            );
        }

        return (
            <Badge className="bg-gray-600/30 text-gray-300 border-gray-500 shadow-lg shadow-gray-500/30 border-2">
                <X className="w-4 h-4 mr-1" />
                MANUALLY CLOSED
            </Badge>
        );
    }

    return null;
}