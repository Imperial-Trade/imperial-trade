import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Brain,
  Image as ImageIcon,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { TradeJournalEntry } from '@/api/client/operations/TradeJournalEntry';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { formatYmdLocal } from '@/lib/date';

interface MobileDayViewProps {
  date: Date;
  entries: any[];
  onBack: () => void;
  onDelete: (entryId: string) => void;
}

export default function MobileDayView({ 
  date, 
  entries, 
  onBack,
  onDelete 
}: MobileDayViewProps) {
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [showScreenshots, setShowScreenshots] = useState<Record<string, boolean>>({});

  // Filter entries for the specific date
  const dayEntries = useMemo(() => {
    const targetDate = formatYmdLocal(date);
    return entries.filter(entry => entry.trade_date === targetDate);
  }, [entries, date]);

  // Calculate day statistics
  const dayStats = useMemo(() => {
    const totalPnL = dayEntries.reduce((sum, entry) => sum + (entry.pnl || 0), 0);
    const winningTrades = dayEntries.filter(entry => (entry.pnl || 0) > 0);
    const losingTrades = dayEntries.filter(entry => (entry.pnl || 0) < 0);
    const winRate = dayEntries.length > 0 ? (winningTrades.length / dayEntries.length) * 100 : 0;
    
    return {
      totalPnL,
      tradeCount: dayEntries.length,
      winCount: winningTrades.length,
      lossCount: losingTrades.length,
      winRate,
      bestTrade: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0,
      worstTrade: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0
    };
  }, [dayEntries]);

  const toggleExpanded = (tradeId: string) => {
    setExpandedTrade(prev => prev === tradeId ? null : tradeId);
  };

  const toggleScreenshot = (entryId: string) => {
    setShowScreenshots(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  if (dayEntries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Calendar
              </Button>
            </div>
            
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {format(date, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trades This Day</h3>
              <p className="text-muted-foreground">
                You didn't record any trades on this date.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Calendar
            </Button>
          </div>
          
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {format(date, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Day Summary */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Total P&L</span>
              </div>
              <div className={`text-lg font-bold ${
                dayStats.totalPnL > 0 ? 'text-emerald-500' : 
                dayStats.totalPnL < 0 ? 'text-red-500' : 'text-yellow-500'
              }`}>
                ${dayStats.totalPnL >= 0 ? '+' : ''}${dayStats.totalPnL.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-lg font-bold">
                {dayStats.winRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <Badge variant="outline">
              {dayStats.tradeCount} Trade{dayStats.tradeCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-emerald-600">
              {dayStats.winCount} Win{dayStats.winCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-red-600">
              {dayStats.lossCount} Loss{dayStats.lossCount !== 1 ? 'es' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Trades List */}
      <div className="space-y-3">
        <AnimatePresence>
          {dayEntries.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Trade Summary */}
                  <button
                    onClick={() => toggleExpanded(trade.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {trade.asset_ticker}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(trade.created_at), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(trade.pnl || 0) > 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (trade.pnl || 0) < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <Target className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`font-bold ${
                          (trade.pnl || 0) > 0 ? 'text-emerald-500' : 
                          (trade.pnl || 0) < 0 ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          ${(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    {trade.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {trade.notes}
                      </p>
                    )}
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedTrade === trade.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border space-y-4"
                      >
                        {/* Trade Details */}
                        {(trade.entry_price || trade.exit_price || trade.position_size) && (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {trade.entry_price && (
                              <div>
                                <span className="text-muted-foreground">Entry:</span>
                                <div className="font-medium">${trade.entry_price}</div>
                              </div>
                            )}
                            {trade.exit_price && (
                              <div>
                                <span className="text-muted-foreground">Exit:</span>
                                <div className="font-medium">${trade.exit_price}</div>
                              </div>
                            )}
                            {trade.position_size && (
                              <div>
                                <span className="text-muted-foreground">Size:</span>
                                <div className="font-medium">{trade.position_size}</div>
                              </div>
                            )}
                            {trade.trade_type && (
                              <div>
                                <span className="text-muted-foreground">Type:</span>
                                <div className="font-medium">{trade.trade_type}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Full Notes */}
                        {trade.notes && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Trade Notes</span>
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                              {trade.notes}
                            </p>
                          </div>
                        )}

                        {/* AI Feedback */}
                        {trade.ai_positive_feedback && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">AI Feedback</span>
                            </div>
                            <p className="text-sm text-muted-foreground bg-primary/5 rounded-lg p-3">
                              {trade.ai_positive_feedback}
                            </p>
                          </div>
                        )}

                        {/* Screenshot */}
                        {(trade as any).screenshot_urls && (trade as any).screenshot_urls.length > 0 ? (
                          <ImageGalleryWithUrls 
                            paths={(trade as any).screenshot_urls}
                            alt="Trade charts"
                          />
                        ) : trade.screenshot_url && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Screenshot</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleScreenshot(trade.id)}
                              >
                                {showScreenshots[trade.id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            
                            <AnimatePresence>
                              {showScreenshots[trade.id] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <img
                                    src={trade.screenshot_url}
                                    alt="Trade screenshot"
                                    className="w-full max-h-64 object-cover rounded-lg"
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(trade.id)}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Helper component to handle signed URLs
const ImageGalleryWithUrls: React.FC<{ paths: string[], alt: string }> = ({ paths, alt }) => {
  const { signedUrls, loading, error } = useSignedUrls(paths);
  
  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading images...</div>;
  }
  
  if (error || signedUrls.length === 0) {
    return null;
  }
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Charts ({signedUrls.length})</span>
      </div>
      <ImageGallery images={signedUrls} alt={alt} />
    </div>
  );
};