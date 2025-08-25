
import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  User,
  Shield,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { TradeAlertData } from '@/types/components';
import { cn } from '@/lib/utils';

interface CompactSignalCardProps {
  signal: TradeAlertData;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar?: string;
    verified?: boolean;
    rating?: number;
  };
  currentPrice?: number;
  pnlData?: {
    unrealizedPnL: number;
    percentage: number;
    isProfit: boolean;
  };
  onStatusUpdate?: (signal: TradeAlertData, newStatus: string) => void;
  onTakeProfitHit?: (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => void;
  onStopLossHit?: (alert: TradeAlertData, closeReason: string) => void;
  onOrderActivation?: (alert: TradeAlertData) => void;
  isCreator?: boolean;
  isAdmin?: boolean;
}

export const CompactSignalCard: React.FC<CompactSignalCardProps> = ({
  signal,
  creator,
  currentPrice,
  pnlData,
  isCreator = false,
  isAdmin = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-amber-400';
      case 'closed': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTradeTypeIcon = (type: string) => {
    const isBuy = type.includes('buy');
    return isBuy ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-400" />
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 5
    }).format(price);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(34, 197, 94, 0.02)' }}
      className="group relative bg-black/20 border border-gray-800/50 hover:border-green-500/30 rounded-lg p-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        {/* Left: Creator Info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar className="w-8 h-8">
            <AvatarImage src={creator?.avatar} />
            <AvatarFallback className="bg-gray-700 text-xs">
              {creator?.display_name?.charAt(0) || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {creator?.display_name || 'Unknown'}
              </span>
              {creator?.role === 'admin' && (
                <Badge className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 border-green-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  ADMIN
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Center-Left: Asset & Trade Type */}
        <div className="flex items-center gap-3 min-w-[150px]">
          <div className="flex items-center gap-2">
            {getTradeTypeIcon(signal.trade_type)}
            <span className="text-lg font-bold text-white">
              {signal.asset_name}
            </span>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(signal.status))} />
            <span className="text-xs text-gray-400 uppercase">
              {signal.status}
            </span>
          </div>
        </div>

        {/* Center: Live Price */}
        <div className="flex flex-col items-center min-w-[120px]">
          <div className="text-lg font-mono text-white">
            {currentPrice ? formatPrice(currentPrice) : formatPrice(signal.entry_price)}
          </div>
          {pnlData && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              pnlData.isProfit ? "text-green-500" : "text-red-400"
            )}>
              {pnlData.isProfit ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {pnlData.isProfit ? '+' : ''}{pnlData.percentage.toFixed(2)}%
            </div>
          )}
        </div>

        {/* Center-Right: Trading Levels */}
        <div className="flex items-center gap-6 min-w-[300px]">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Entry</div>
            <div className="text-sm font-mono text-white">
              {formatPrice(signal.entry_price)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
            <div className="text-sm font-mono text-red-400">
              {formatPrice(signal.stop_loss)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Take Profit</div>
            <div className="text-sm font-mono text-green-500">
              {signal.tp1 ? formatPrice(signal.tp1) : '—'}
            </div>
          </div>
        </div>

        {/* Right: Time & Actions */}
        <div className="flex items-center gap-3 min-w-[100px] justify-end">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(signal.created_date)}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notes Preview */}
      {signal.notes && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <p className="text-sm text-gray-300 line-clamp-1">
            {signal.notes}
          </p>
        </div>
      )}
    </motion.div>
  );
};
