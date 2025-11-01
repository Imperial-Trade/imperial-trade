
import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { TradeJournalEntry } from "@/api/entities";

interface JournalAnalyticsProps {
  entries: TradeJournalEntry[];
}

const JournalAnalytics = memo(({ entries }: JournalAnalyticsProps) => {
  const analytics = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalPnL: 0,
        winRate: 0,
        totalTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
    }

    const totalPnL = entries.reduce((sum, entry) => sum + entry.pnl, 0);
    const winningTrades = entries.filter(entry => entry.pnl > 0);
    const losingTrades = entries.filter(entry => entry.pnl < 0);
    
    const winRate = entries.length > 0 ? (winningTrades.length / entries.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, entry) => sum + entry.pnl, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, entry) => sum + entry.pnl, 0) / losingTrades.length 
      : 0;
    
    const bestTrade = Math.max(...entries.map(entry => entry.pnl));
    const worstTrade = Math.min(...entries.map(entry => entry.pnl));

    return {
      totalPnL,
      winRate,
      totalTrades: entries.length,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
    };
  }, [entries]);

  const StatCard = ({ title, value, icon: Icon, isPositive }: { 
    title: string; 
    value: string; 
    icon: any; 
    isPositive?: boolean;
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${
          isPositive === true ? 'text-emerald-600' : 
          isPositive === false ? 'text-red-500' : 
          'text-foreground'
        }`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={`$${analytics.totalPnL.toFixed(2)}`}
          icon={DollarSign}
          isPositive={analytics.totalPnL >= 0}
        />
        <StatCard
          title="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          icon={Target}
        />
        <StatCard
          title="Avg Win"
          value={`$${analytics.avgWin.toFixed(2)}`}
          icon={TrendingUp}
          isPositive={true}
        />
        <StatCard
          title="Avg Loss"
          value={`$${Math.abs(analytics.avgLoss).toFixed(2)}`}
          icon={TrendingDown}
          isPositive={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Best Trade"
          value={`$${analytics.bestTrade.toFixed(2)}`}
          icon={TrendingUp}
          isPositive={true}
        />
        <StatCard
          title="Worst Trade"
          value={`$${Math.abs(analytics.worstTrade).toFixed(2)}`}
          icon={TrendingDown}
          isPositive={false}
        />
      </div>
    </div>
  );
});

JournalAnalytics.displayName = 'JournalAnalytics';

export default JournalAnalytics;
