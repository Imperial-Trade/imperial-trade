
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Shield, 
  MoreVertical,
  ExternalLink,
  Copy,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradeAlertData } from '@/types/components';

interface ProfessionalSignalCardProps {
  signal: TradeAlertData;
  onExpand?: (signal: TradeAlertData) => void;
  onStatusUpdate?: (signal: TradeAlertData, status: string) => void;
  onTakeProfitHit?: (signal: TradeAlertData, tpLevel: number) => void;
  className?: string;
}

export const ProfessionalSignalCard: React.FC<ProfessionalSignalCardProps> = ({
  signal,
  onExpand,
  onStatusUpdate,
  onTakeProfitHit,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Calculate P&L and performance metrics
  const entryPrice = signal.entry_price;
  const currentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.02); // Mock current price
  const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  const isProfit = pnlPercent > 0;
  
  // Status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-trading-success-bg text-trading-success border-trading-success/20';
      case 'pending':
        return 'bg-trading-warning-bg text-trading-warning border-trading-warning/20';
      case 'closed':
        return 'bg-trading-text-muted/10 text-trading-text-muted border-trading-text-muted/20';
      default:
        return 'bg-trading-info-bg text-trading-info border-trading-info/20';
    }
  };

  const getTradeTypeIcon = (type: string) => {
    return type.includes('buy') ? (
      <TrendingUp className="w-4 h-4 text-trading-success" />
    ) : (
      <TrendingDown className="w-4 h-4 text-trading-danger" />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-success/30 transition-all duration-300 shadow-trading-card hover:shadow-trading-elevated overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-trading-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getTradeTypeIcon(signal.trade_type)}
                <span className="font-bold text-lg text-trading-text-primary">
                  {signal.asset_name}
                </span>
                <Badge className={getStatusStyle(signal.status)}>
                  {signal.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className={`text-lg font-bold ${isProfit ? 'text-trading-success' : 'text-trading-danger'}`}>
                  {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-trading-text-muted">P&L</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-trading-text-muted hover:text-trading-text-primary"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Price Information */}
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide">Entry</div>
              <div className="text-sm font-mono text-trading-text-primary">
                {signal.entry_price.toFixed(5)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide">Current</div>
              <div className={`text-sm font-mono ${isProfit ? 'text-trading-success' : 'text-trading-danger'}`}>
                {currentPrice.toFixed(5)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide">Stop Loss</div>
              <div className="text-sm font-mono text-trading-danger">
                {signal.stop_loss.toFixed(5)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide">Risk</div>
              <div className="text-sm font-mono text-trading-warning">
                {(((signal.entry_price - signal.stop_loss) / signal.entry_price) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Take Profit Levels */}
          {(signal.tp1 || signal.tp2 || signal.tp3) && (
            <div className="mb-4">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide mb-2">Take Profit Levels</div>
              <div className="flex flex-wrap gap-2">
                {[signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5].filter(Boolean).map((tp, index) => {
                  const isHit = signal.tp_hits?.includes(index + 1);
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className={`px-3 py-1 rounded-full text-xs font-mono border ${
                        isHit 
                          ? 'bg-trading-success-bg text-trading-success border-trading-success' 
                          : 'bg-trading-bg-secondary text-trading-text-secondary border-trading-border'
                      }`}
                    >
                      TP{index + 1}: {tp?.toFixed(5)}
                      {isHit && <span className="ml-1">✓</span>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signal Notes */}
          {signal.notes && (
            <div className="mb-4">
              <div className="text-xs text-trading-text-muted uppercase tracking-wide mb-1">Analysis</div>
              <p className="text-sm text-trading-text-secondary leading-relaxed">
                {signal.notes}
              </p>
            </div>
          )}
        </div>

        {/* Expandable Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-trading-border/50 bg-trading-bg-secondary/50"
            >
              <div className="p-4">
                {/* Advanced Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-trading-text-muted">Risk/Reward</div>
                    <div className="text-sm font-bold text-trading-success">1:3.2</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-trading-text-muted">Duration</div>
                    <div className="text-sm text-trading-text-primary">2h 34m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-trading-text-muted">Volume</div>
                    <div className="text-sm text-trading-text-primary">0.5 lots</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-trading-text-muted">Confidence</div>
                    <div className="text-sm text-trading-warning">85%</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLiked(!isLiked)}
                    className={`border-trading-border hover:border-trading-success/50 ${
                      isLiked ? 'bg-trading-success-bg text-trading-success' : 'text-trading-text-secondary'
                    }`}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-trading-border hover:border-trading-info/50 text-trading-text-secondary"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Comment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-trading-border hover:border-trading-warning/50 text-trading-text-secondary"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-trading-border hover:border-trading-premium/50 text-trading-text-secondary"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer with timestamp */}
        <div className="px-4 py-2 border-t border-trading-border/30 bg-trading-bg-primary/50">
          <div className="flex items-center justify-between text-xs text-trading-text-muted">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(signal.created_date).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>1.2k</span>
              </span>
              <span className="flex items-center space-x-1">
                <Heart className="w-3 h-3" />
                <span>89</span>
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
