
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Shield,
  Activity,
  ArrowUp,
  ArrowDown,
  Copy,
  Share2,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWebSocketLivePrice } from '@/hooks/useWebSocketLivePrice';
import { TradeAlertData } from '@/types/components';

interface EnhancedSignalCardProps {
  signal: TradeAlertData;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string | null;
  };
  isNew?: boolean;
  onStatusUpdate?: (signal: TradeAlertData, newStatus: string) => void;
}

export const EnhancedSignalCard: React.FC<EnhancedSignalCardProps> = ({
  signal,
  creator,
  isNew = false,
  onStatusUpdate
}) => {
  const { price: livePrice, change, changePercent, connectionStatus } = useWebSocketLivePrice(signal.tradermade_symbol);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTradeTypeIcon = (tradeType: string) => {
    return tradeType.includes('buy') ? TrendingUp : TrendingDown;
  };

  const getTradeTypeColor = (tradeType: string) => {
    return tradeType.includes('buy') ? 'text-green-400' : 'text-red-400';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const signalTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - signalTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const TradeIcon = getTradeTypeIcon(signal.trade_type);
  const isActive = signal.status === 'active';
  const isPending = signal.status === 'pending';

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={isNew ? { opacity: 1, y: 0, scale: 1 } : false}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-800/50 hover:border-gray-600/50 transition-all duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            {/* Creator Info */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center">
                <span className="text-amber-400 text-xs font-bold">👑</span>
              </div>
              <span className="text-white font-medium">{creator?.display_name}</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-2 py-0.5">
                {creator?.role === 'admin' ? 'Admin' : 'Educator'}
              </Badge>
              <span className="text-gray-400 text-sm">{formatTime(signal.created_date)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Asset and Status */}
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-white">{signal.asset_name}</h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-medium">
                💰 {signal.trade_type.includes('limit') ? `PENDING ${signal.trade_type.replace('_', ' ').toUpperCase()}` : 'PENDING'}
              </Badge>
              {isPending && (
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                  PENDING
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Live Price Section */}
        <div className="p-4 bg-gray-800/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-medium">Live Price for {signal.tradermade_symbol}</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-0.5">
                📈 15ms
              </Badge>
              <span className="text-green-400 text-xs">Live</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-green-400">
                ${livePrice ? formatPrice(livePrice) : formatPrice(signal.entry_price)}
              </span>
              {change !== 0 && (
                <div className="flex items-center gap-1 text-green-400">
                  <ArrowUp className="w-4 h-4" />
                  <span className="font-medium">+{Math.abs(change).toFixed(4)}</span>
                  <span className="text-sm">(+{Math.abs(changePercent).toFixed(2)}%)</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">📈 Updated: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Trading Levels */}
        <div className="p-4 space-y-3">
          {/* Entry Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300">Entry Price</span>
            </div>
            <span className="text-white font-mono">${formatPrice(signal.entry_price)}</span>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-300">Stop Loss</span>
            </div>
            <span className="text-white font-mono">${formatPrice(signal.stop_loss)}</span>
          </div>

          {/* Take Profit 1 */}
          {signal.tp1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Take Profit 1</span>
              </div>
              <span className="text-white font-mono">${formatPrice(signal.tp1)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {signal.notes && (
          <div className="p-4 pt-0">
            <div className="text-sm font-medium text-gray-300 mb-2">Notes</div>
            <div className="text-gray-400 text-sm">
              {signal.notes}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
