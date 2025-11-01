import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Trophy, Calendar, BarChart3, PieChart } from 'lucide-react';
import { TradeJournalEntry } from '@/api/entities';

interface MobileAnalyticsProps {
  entries: TradeJournalEntry[];
}

const MobileAnalytics = memo(({ entries }: MobileAnalyticsProps) => {
  const analytics = useMemo(() => {
    if (!entries.length) {
      return {
        totalPnL: 0,
        winRate: 0,
        totalTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        profitFactor: 0,
        avgHoldTime: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        largestDrawdown: 0,
        winningStreak: 0,
        losingStreak: 0
      };
    }

    const totalPnL = entries.reduce((sum, entry) => sum + entry.pnl, 0);
    const wins = entries.filter(entry => entry.pnl > 0);
    const losses = entries.filter(entry => entry.pnl < 0);
    
    const winRate = (wins.length / entries.length) * 100;
    const avgWin = wins.length > 0 ? wins.reduce((sum, entry) => sum + entry.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, entry) => sum + entry.pnl, 0) / losses.length) : 0;
    
    const grossProfit = wins.reduce((sum, entry) => sum + entry.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, entry) => sum + entry.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const bestTrade = Math.max(...entries.map(entry => entry.pnl));
    const worstTrade = Math.min(...entries.map(entry => entry.pnl));

    // Calculate streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    entries.forEach(entry => {
      if (entry.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (entry.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    });

    return {
      totalPnL,
      winRate,
      totalTrades: entries.length,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      profitFactor,
      winningStreak: maxWinStreak,
      losingStreak: maxLossStreak
    };
  }, [entries]);

  const StatCard = ({ title, value, icon: Icon, trend, subtitle, colorClass = "" }: {
    title: string;
    value: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
    colorClass?: string;
  }) => (
    <Card className={`bg-gradient-to-br ${colorClass || 'from-card to-card/50'} border-border/50`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Icon className={`w-5 h-5 ${
            trend === 'up' ? 'text-emerald-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-primary'
          }`} />
          {trend && (
            <div className={`p-1 rounded-full ${
              trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-900' : 
              'bg-red-100 dark:bg-red-900'
            }`}>
              {trend === 'up' ? 
                <TrendingUp className="w-3 h-3 text-emerald-600" /> : 
                <TrendingDown className="w-3 h-3 text-red-600" />
              }
            </div>
          )}
        </div>
        <p className="text-lg font-bold text-foreground mb-1">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (entries.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Analytics Yet
          </h3>
          <p className="text-muted-foreground">
            Start logging trades to see your performance analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Performance Overview */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total P&L"
          value={`${analytics.totalPnL >= 0 ? '+' : ''}$${analytics.totalPnL.toFixed(2)}`}
          icon={Target}
          trend={analytics.totalPnL >= 0 ? 'up' : 'down'}
          colorClass={analytics.totalPnL >= 0 ? 
            'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900' : 
            'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900'
          }
        />
        
        <StatCard
          title="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          icon={Trophy}
          trend={analytics.winRate >= 50 ? 'up' : 'down'}
          subtitle={`${entries.filter(e => e.pnl > 0).length} wins`}
          colorClass="from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
        />
      </div>

      {/* Win/Loss Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Win/Loss Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Win</span>
                <span className="font-medium text-emerald-600">+${analytics.avgWin.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Best Trade</span>
                <span className="font-medium text-emerald-600">+${analytics.bestTrade.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win Streak</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {analytics.winningStreak}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Loss</span>
                <span className="font-medium text-red-500">-${analytics.avgLoss.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Worst Trade</span>
                <span className="font-medium text-red-500">${analytics.worstTrade.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Loss Streak</span>
                <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  {analytics.losingStreak}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          title="Profit Factor"
          value={analytics.profitFactor === Infinity ? '∞' : analytics.profitFactor.toFixed(2)}
          icon={BarChart3}
          trend={analytics.profitFactor >= 1.5 ? 'up' : analytics.profitFactor >= 1 ? 'neutral' : 'down'}
          subtitle={analytics.profitFactor >= 1.5 ? 'Excellent' : analytics.profitFactor >= 1 ? 'Good' : 'Needs improvement'}
          colorClass="from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
        />
      </div>

      {/* Trading Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Trading Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Trades</span>
              <Badge variant="outline">{analytics.totalTrades}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Winning Trades</span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {entries.filter(e => e.pnl > 0).length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Losing Trades</span>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {entries.filter(e => e.pnl < 0).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

MobileAnalytics.displayName = 'MobileAnalytics';

export default MobileAnalytics;