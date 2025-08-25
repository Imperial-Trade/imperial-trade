
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
  ArrowDown
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
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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

  const calculatePotentialPnL = () => {
    if (!livePrice || !signal.tp1) return null;
    
    const entryPrice = signal.entry_price;
    const isBuy = signal.trade_type.includes('buy');
    
    if (isBuy) {
      return ((signal.tp1 - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - signal.tp1) / entryPrice) * 100;
    }
  };

  const potentialPnL = calculatePotentialPnL();
  const TradeIcon = getTradeTypeIcon(signal.trade_type);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={isNew ? { opacity: 1, y: 0, scale: 1 } : false}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-6 bg-gradient-to-br from-gray-900/50 via-gray-800/30 to-gray-900/50 border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 ${isNew ? 'ring-2 ring-green-500/30' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${signal.trade_type.includes('buy') ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <TradeIcon className={`w-5 h-5 ${getTradeTypeColor(signal.trade_type)}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{signal.asset_name}</h3>
              <p className="text-sm text-gray-400">{signal.tradermade_symbol}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isNew && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                New
              </Badge>
            )}
            <Badge className={getStatusColor(signal.status)}>
              {signal.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Creator Info */}
        {creator && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-black/20 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={creator.avatar_url || ''} />
              <AvatarFallback className="bg-gray-700 text-white text-xs">
                {creator.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-white">{creator.display_name}</p>
              <p className="text-xs text-gray-400 capitalize">{creator.role}</p>
            </div>
          </div>
        )}

        {/* Price Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Entry Price</span>
              <span className="text-sm font-medium text-white">{signal.entry_price}</span>
            </div>
            
            {livePrice && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Live Price</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-white">{livePrice.toFixed(5)}</span>
                  {change !== 0 && (
                    <div className={`flex items-center gap-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      <span className="text-xs">{Math.abs(changePercent).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Stop Loss</span>
              <span className="text-sm font-medium text-red-400">{signal.stop_loss}</span>
            </div>
          </div>

          <div className="space-y-2">
            {signal.tp1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">TP1</span>
                <span className="text-sm font-medium text-green-400">{signal.tp1}</span>
              </div>
            )}
            
            {potentialPnL && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Potential P&L</span>
                <span className={`text-sm font-medium ${potentialPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {potentialPnL > 0 ? '+' : ''}{potentialPnL.toFixed(2)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Trade Type</span>
              <span className={`text-sm font-medium capitalize ${getTradeTypeColor(signal.trade_type)}`}>
                {signal.trade_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Take Profit Levels */}
        {(signal.tp1 || signal.tp2 || signal.tp3 || signal.tp4 || signal.tp5) && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Take Profit Levels</p>
            <div className="flex gap-2 flex-wrap">
              {[signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5].map((tp, index) => (
                tp && (
                  <Badge
                    key={index}
                    variant="outline"
                    className={`text-xs ${
                      signal.tp_hits?.includes(index + 1)
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-gray-800/50 text-gray-300 border-gray-600/50'
                    }`}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    TP{index + 1}: {tp}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {signal.notes && (
          <div className="mb-4 p-3 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-300">{signal.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(signal.created_date).toLocaleString()}
          </div>
          
          <div className="flex items-center gap-1">
            <Activity className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-green-400' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-400">
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
