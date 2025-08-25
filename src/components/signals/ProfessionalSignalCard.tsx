
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
  User,
  Star,
  Copy,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { TradeAlertData } from '@/types/components';
import { cn } from '@/lib/utils';

interface ProfessionalSignalCardProps {
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

export const ProfessionalSignalCard: React.FC<ProfessionalSignalCardProps> = ({
  signal,
  creator,
  currentPrice,
  pnlData,
  onStatusUpdate,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  isCreator = false,
  isAdmin = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-accentGreen-light border-accentGreen-light/20';
      case 'pending': return 'text-amber-400 border-amber-400/20';
      case 'closed': return 'text-gray-400 border-gray-400/20';
      default: return 'text-gray-400 border-gray-400/20';
    }
  };

  const getTradeTypeIcon = (type: string) => {
    const isBuy = type.includes('buy');
    return isBuy ? (
      <TrendingUp className="w-4 h-4 text-accentGreen-light" />
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <Card className="bg-black/40 backdrop-blur-xl border-gray-800/50 hover:border-accentGreen-light/30 transition-all duration-300 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getTradeTypeIcon(signal.trade_type)}
                  <span className="text-xl font-bold text-white">
                    {signal.asset_name}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-medium", getStatusColor(signal.status))}
                  >
                    {signal.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pnlData && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-semibold",
                      pnlData.isProfit 
                        ? "bg-accentGreen-light/10 text-accentGreen-light" 
                        : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {pnlData.isProfit ? '+' : ''}{pnlData.percentage.toFixed(2)}%
                  </motion.div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Creator Info */}
            {creator && (
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={creator.avatar} />
                  <AvatarFallback className="bg-gray-700 text-xs">
                    {creator.display_name?.charAt(0) || <User className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-300">{creator.display_name}</span>
                {creator.verified && (
                  <Badge variant="secondary" className="text-xs bg-accentGreen-light/10 text-accentGreen-light border-0">
                    ✓ Verified
                  </Badge>
                )}
                {creator.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="text-xs text-gray-400">{creator.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Entry</div>
                <div className="text-sm font-mono text-white">
                  {formatPrice(signal.entry_price)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Current</div>
                <div className="text-sm font-mono text-white">
                  {currentPrice ? formatPrice(currentPrice) : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">P&L</div>
                <div className={cn(
                  "text-sm font-semibold",
                  pnlData?.isProfit ? "text-accentGreen-light" : "text-red-400"
                )}>
                  {pnlData ? `${pnlData.isProfit ? '+' : ''}${pnlData.unrealizedPnL.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <Separator className="bg-gray-800/50" />
                <div className="p-4 pt-3">
                  {/* Target Levels */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Take Profit Levels
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5].map((tp, index) => (
                        tp && (
                          <div
                            key={`tp${index + 1}`}
                            className={cn(
                              "p-2 rounded border text-center",
                              signal.tp_hits?.includes(index + 1)
                                ? "bg-accentGreen-light/10 border-accentGreen-light/30 text-accentGreen-light"
                                : "bg-gray-800/30 border-gray-700/50 text-gray-300"
                            )}
                          >
                            <div className="text-xs text-gray-400">TP{index + 1}</div>
                            <div className="text-sm font-mono">{formatPrice(tp)}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Stop Loss */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Risk Management
                    </div>
                    <div className="p-3 rounded bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Stop Loss</span>
                        <span className="text-sm font-mono text-red-400">
                          {formatPrice(signal.stop_loss)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {signal.notes && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-300 mb-2">Analysis</div>
                      <div className="p-3 rounded bg-gray-800/30 border border-gray-700/50">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {signal.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500">
                      {formatDate(signal.created_date)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Border Effect */}
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isHovered ? 1 : 0,
              background: isHovered 
                ? "linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.1), transparent)"
                : "transparent"
            }}
            transition={{ duration: 0.3 }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};
