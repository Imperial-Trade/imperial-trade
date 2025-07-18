
import React, { memo, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Award, 
  Brain, 
  Sparkles, 
  BarChart3 
} from "lucide-react";

interface JournalEntry {
  id: string;
  pnl: number;
  asset_ticker: string;
  trade_date: string;
  notes?: string;
  ai_positive_feedback?: string;
}

interface JournalAnalyticsProps {
  entries: JournalEntry[];
}

const JournalAnalytics = memo(({ entries }: JournalAnalyticsProps) => {
  const analytics = useMemo(() => {
    if (entries.length === 0) return null;

    const winningTrades = entries.filter((e) => e.pnl > 0);
    const losingTrades = entries.filter((e) => e.pnl < 0);
    const totalPnL = entries.reduce((sum, e) => sum + e.pnl, 0);
    const winRate = ((winningTrades.length / entries.length) * 100).toFixed(1);
    const avgWin = winningTrades.length > 0
      ? (winningTrades.reduce((sum, e) => sum + e.pnl, 0) / winningTrades.length).toFixed(2)
      : "0";
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, e) => sum + e.pnl, 0) / losingTrades.length).toFixed(2)
      : "0";
    const profitFactor = losingTrades.length > 0
      ? Math.abs(totalPnL / (losingTrades.reduce((sum, e) => sum + e.pnl, 0) || 1)).toFixed(2)
      : "∞";

    return { winRate, avgWin, avgLoss, profitFactor, totalPnL };
  }, [entries]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Data Available
          </h3>
          <p className="text-muted-foreground">
            Add some trades to see your analytics and AI insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Total P&L
                </p>
                <p className={`text-2xl font-bold ${
                  analytics.totalPnL >= 0
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}>
                  {analytics.totalPnL >= 0 ? "+" : ""}$
                  {analytics.totalPnL.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Win Rate
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.winRate}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Avg Win
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  ${analytics.avgWin}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Profit Factor
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.profitFactor}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analytics Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                AI Performance Insights
              </h3>
              <p className="text-sm text-muted-foreground">
                Powered by advanced analytics
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
              <p className="text-sm text-foreground">
                Your win rate of {analytics.winRate}% is{" "}
                {parseFloat(analytics.winRate) > 50 ? "above" : "below"} the
                50% benchmark.
                {parseFloat(analytics.winRate) > 60 &&
                  " Excellent consistency!"}
                {parseFloat(analytics.winRate) < 40 &&
                  " Focus on risk management and entry timing."}
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
              <p className="text-sm text-foreground">
                Your profit factor of {analytics.profitFactor} indicates{" "}
                {parseFloat(analytics.profitFactor) > 1.5
                  ? "strong"
                  : parseFloat(analytics.profitFactor) > 1
                  ? "positive"
                  : "concerning"}{" "}
                performance.
                {parseFloat(analytics.profitFactor) > 2 &&
                  " You're managing risk exceptionally well!"}
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <Target className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
              <p className="text-sm text-foreground">
                Average win of ${analytics.avgWin} vs average loss of $
                {analytics.avgLoss} shows a{" "}
                {parseFloat(String(analytics.avgWin)) >
                parseFloat(String(analytics.avgLoss))
                  ? "positive"
                  : "negative"}{" "}
                risk-reward ratio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equity Curve Placeholder */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Equity Curve
          </h3>
          <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Interactive equity curve coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

JournalAnalytics.displayName = 'JournalAnalytics';

export default JournalAnalytics;
