import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Target, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardMetrics } from './types';

interface DashboardMetricsProps {
  metrics: DashboardMetrics;
}

export const EnhancedDashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const { theme } = useTheme();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className={cn(
        "border-2 transition-all duration-300 hover:scale-105",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-green-500/50" 
          : "bg-white border-slate-200 hover:border-green-500/50",
        metrics.totalPnL >= 0 && "border-green-500/30"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total P/L</p>
              <p className={cn(
                "text-2xl font-bold",
                metrics.totalPnL >= 0 ? "text-green-500" : "text-red-500"
              )}>
                ${metrics.totalPnL.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg: ${(metrics.totalPnL / Math.max(metrics.totalTrades, 1)).toFixed(2)}
              </p>
            </div>
            <DollarSign className={cn(
              "h-8 w-8",
              metrics.totalPnL >= 0 ? "text-green-500" : "text-red-500"
            )} />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300 hover:scale-105",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-blue-500/50" 
          : "bg-white border-slate-200 hover:border-blue-500/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-blue-500">
                {metrics.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(metrics.winRate * metrics.totalTrades / 100)} wins
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300 hover:scale-105",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-purple-500/50" 
          : "bg-white border-slate-200 hover:border-purple-500/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className="text-2xl font-bold text-purple-500">
                {metrics.profitFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.profitFactor > 1.5 ? 'Excellent' : metrics.profitFactor > 1.0 ? 'Good' : 'Needs Work'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300 hover:scale-105",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-orange-500/50" 
          : "bg-white border-slate-200 hover:border-orange-500/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold text-orange-500">
                {metrics.totalTrades}
              </p>
              <p className="text-xs text-muted-foreground">
                Best: ${metrics.bestTrade.toFixed(0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};