import React, { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Trash2, Brain, MessageSquare, Target, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { TradeJournalEntry } from '@/api/entities';
import { ImageGalleryWithUrls } from '@/components/tools/ImageGalleryWithUrls';
import { parseYmdToLocalDate } from '@/lib/date';

interface MobileRecentTradesProps {
  entries: TradeJournalEntry[];
  onDelete: (entryId: string) => void;
  showAll?: boolean;
}

const MobileRecentTrades = memo(({ entries, onDelete, showAll = false }: MobileRecentTradesProps) => {
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);

  const toggleExpanded = (tradeId: string) => {
    setExpandedTrade(expandedTrade === tradeId ? null : tradeId);
  };

  if (entries.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                No Trades Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Start logging your trades to track your progress
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayEntries = showAll ? entries : entries.slice(0, 3);

  return (
    <div className="space-y-3">
      {displayEntries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-4">
              {/* Trade Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-medium">
                    {entry.asset_ticker}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(parseYmdToLocalDate(entry.trade_date), "MMM dd, yyyy")}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-muted-foreground" />
                    <span
                      className={`font-bold text-sm ${
                        entry.pnl >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(entry.id)}
                    className="p-1 h-6 w-6"
                  >
                    {expandedTrade === entry.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Compact Trade Notes */}
              {entry.notes && (
                <div className="mb-3">
                  <p className={`text-sm text-foreground leading-relaxed ${
                    expandedTrade !== entry.id ? 'line-clamp-2' : ''
                  }`}>
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedTrade === entry.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {/* Your Trading Coach */}
                    {(entry.ai_positive_feedback || (entry as any).coach_status === 'pending') && (
                      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-3 border border-primary/20 min-h-[64px]">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <Brain className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-primary">Your Trading Coach</span>
                              <span className="invisible text-xs h-4 px-1"></span>
                            </div>
                            <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {(entry as any).coach_status === 'pending' 
                                ? '👉 "Your coach is looking over your journal…"'
                                : entry.ai_positive_feedback
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Screenshot */}
                    {(entry as any).screenshot_urls && (entry as any).screenshot_urls.length > 0 ? (
                      <ImageGalleryWithUrls 
                        paths={(entry as any).screenshot_urls}
                        alt="Trade charts"
                      />
                    ) : entry.screenshot_url && (
                      <div className="relative group cursor-pointer rounded-lg overflow-hidden">
                        <img
                          src={entry.screenshot_url}
                          alt="Trade screenshot"
                          className="w-full max-h-32 object-cover transition-all duration-200 group-hover:opacity-80"
                          onClick={() => window.open(entry.screenshot_url, "_blank")}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
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
    </div>
  );
});


MobileRecentTrades.displayName = 'MobileRecentTrades';

export default MobileRecentTrades;