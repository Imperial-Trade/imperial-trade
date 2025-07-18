
import React, { memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Trash2, Brain, MessageSquare } from "lucide-react";

interface JournalEntry {
  id: string;
  asset_ticker: string;
  pnl: number;
  notes?: string;
  trade_date: string;
  ai_positive_feedback?: string;
  screenshot_url?: string;
}

interface JournalLogListProps {
  entries: JournalEntry[];
  isLoading: boolean;
  onDelete: (entryId: string) => void;
}

const JournalLogList = memo(({ entries, isLoading, onDelete }: JournalLogListProps) => {
  if (isLoading) {
    return <p className="text-muted-foreground">Loading journal...</p>;
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start Your Trading Journal
              </h3>
              <p className="text-muted-foreground">
                Add your first trade above to begin tracking your performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">Recent Trades</h3>
      <div className="space-y-4">
        {entries.slice(0, 10).map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="group"
          >
            <Card className="bg-card border-border hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.asset_ticker}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.trade_date), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-lg ${
                        entry.pnl >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {entry.notes && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {entry.notes}
                  </p>
                )}

                {entry.ai_positive_feedback && (
                  <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-l-primary">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground leading-relaxed">
                        {entry.ai_positive_feedback}
                      </p>
                    </div>
                  </div>
                )}

                {entry.screenshot_url && (
                  <div className="mt-3">
                    <img
                      src={entry.screenshot_url}
                      alt="Trade screenshot"
                      className="rounded-lg max-h-32 object-cover cursor-pointer hover:opacity-80 transition"
                      onClick={() =>
                        window.open(entry.screenshot_url, "_blank")
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

JournalLogList.displayName = 'JournalLogList';

export default JournalLogList;
