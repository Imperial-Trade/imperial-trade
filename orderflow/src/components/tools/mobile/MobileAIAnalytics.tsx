import React, { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Target, Clock, Zap } from 'lucide-react';
import { TradeJournalEntry } from '@/api/entities';

interface MobileAIAnalyticsProps {
  entries: TradeJournalEntry[];
}

const MobileAIAnalytics = memo(({ entries }: MobileAIAnalyticsProps) => {
  const aiInsights = useMemo(() => {
    if (!entries.length) {
      return {
        strategy: { score: 0, insight: "Start trading to receive AI analysis" },
        timing: { score: 0, insight: "No timing data available" },
        psychology: { score: 0, insight: "Begin logging emotions" },
        riskManagement: { score: 0, insight: "Track position sizes for analysis" }
      };
    }

    const wins = entries.filter(e => e.pnl > 0);
    const losses = entries.filter(e => e.pnl < 0);
    const winRate = (wins.length / entries.length) * 100;
    
    // Strategy Analysis
    const avgWin = wins.length > 0 ? wins.reduce((sum, e) => sum + e.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, e) => sum + e.pnl, 0) / losses.length) : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    const strategyScore = Math.min(100, (winRate * 0.6) + (riskRewardRatio * 20));
    const strategyInsight = strategyScore >= 80 ? "Excellent strategy consistency" :
                           strategyScore >= 60 ? "Good strategy with room for improvement" :
                           strategyScore >= 40 ? "Strategy needs refinement" :
                           "Consider reviewing your trading approach";

    // Timing Analysis (based on recent performance)
    const recentTrades = entries.slice(-10);
    const recentWinRate = recentTrades.filter(e => e.pnl > 0).length / recentTrades.length * 100;
    const timingScore = Math.min(100, recentWinRate * 1.2);
    const timingInsight = timingScore >= 70 ? "Great timing on recent trades" :
                         timingScore >= 50 ? "Mixed timing results" :
                         "Consider improving entry timing";

    // Psychology Analysis (based on streak analysis)
    let maxWinStreak = 0, maxLossStreak = 0;
    let currentStreak = 0;
    let streakType = 'none';
    
    entries.forEach(entry => {
      if (entry.pnl > 0) {
        if (streakType === 'win') {
          currentStreak++;
        } else {
          currentStreak = 1;
          streakType = 'win';
        }
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        if (streakType === 'loss') {
          currentStreak++;
        } else {
          currentStreak = 1;
          streakType = 'loss';
        }
        maxLossStreak = Math.max(maxLossStreak, currentStreak);
      }
    });

    const psychologyScore = Math.max(0, 100 - (maxLossStreak * 15));
    const psychologyInsight = maxLossStreak <= 2 ? "Good emotional control" :
                             maxLossStreak <= 4 ? "Watch for revenge trading" :
                             "Strong emotional discipline needed";

    // Risk Management
    const totalPnL = entries.reduce((sum, e) => sum + e.pnl, 0);
    const maxDrawdown = Math.abs(Math.min(...entries.map(e => e.pnl)));
    const riskScore = totalPnL >= 0 ? Math.min(100, 80 + (winRate - 50)) : Math.max(0, 50 - maxDrawdown);
    const riskInsight = riskScore >= 80 ? "Excellent risk control" :
                       riskScore >= 60 ? "Good risk management" :
                       riskScore >= 40 ? "Improve position sizing" :
                       "Risk management needs attention";

    return {
      strategy: { score: Math.round(strategyScore), insight: strategyInsight },
      timing: { score: Math.round(timingScore), insight: timingInsight },
      psychology: { score: Math.round(psychologyScore), insight: psychologyInsight },
      riskManagement: { score: Math.round(riskScore), insight: riskInsight }
    };
  }, [entries]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const, class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
    if (score >= 40) return { label: 'Fair', variant: 'secondary' as const, class: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' };
    return { label: 'Poor', variant: 'destructive' as const, class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
  };

  const InsightCard = ({ title, score, insight, icon: Icon, delay = 0 }: {
    title: string;
    score: number;
    insight: string;
    icon: any;
    delay?: number;
  }) => {
    const badge = getScoreBadge(score);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                  {score}
                </span>
                <Badge className={badge.class}>
                  {badge.label}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insight}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (entries.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">
            AI Analysis Coming Soon
          </h3>
          <p className="text-xs text-muted-foreground">
            Log a few trades to unlock personalized AI insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <InsightCard
        title="Strategy"
        score={aiInsights.strategy.score}
        insight={aiInsights.strategy.insight}
        icon={Target}
        delay={0}
      />
      
      <InsightCard
        title="Timing"
        score={aiInsights.timing.score}
        insight={aiInsights.timing.insight}
        icon={Clock}
        delay={0.1}
      />
      
      <InsightCard
        title="Psychology"
        score={aiInsights.psychology.score}
        insight={aiInsights.psychology.insight}
        icon={Brain}
        delay={0.2}
      />
      
      <InsightCard
        title="Risk Management"
        score={aiInsights.riskManagement.score}
        insight={aiInsights.riskManagement.insight}
        icon={AlertTriangle}
        delay={0.3}
      />

      {/* Overall Performance Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  AI Performance Score
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.round((aiInsights.strategy.score + aiInsights.timing.score + aiInsights.psychology.score + aiInsights.riskManagement.score) / 4)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {Math.round((aiInsights.strategy.score + aiInsights.timing.score + aiInsights.psychology.score + aiInsights.riskManagement.score) / 4)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
});

MobileAIAnalytics.displayName = 'MobileAIAnalytics';

export default MobileAIAnalytics;