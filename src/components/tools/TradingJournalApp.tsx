
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, Eye, EyeOff, TrendingUp, TrendingDown, Target, DollarSign, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TradeJournalEntry } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  isPositive?: boolean;
  subtitle?: string;
}

const StatCard = ({ title, value, icon: Icon, isPositive, subtitle }: StatCardProps) => (
  <Card className="bg-card/50 backdrop-blur-sm border-border/20 hover:bg-card/70 transition-all duration-200">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</span>
        </div>
      </div>
      <div className={`text-lg sm:text-2xl font-bold ${
        isPositive === true ? 'text-emerald-400' : 
        isPositive === false ? 'text-red-400' : 
        'text-foreground'
      }`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

const TradingJournalApp = () => {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchedEntries = await TradeJournalEntry.list(user.id);
        setEntries(fetchedEntries);
      }
    } catch (error) {
      console.error("Error loading entries:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

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
        profitableDays: 0,
        currentStreak: 0,
      };
    }

    const totalPnL = entries.reduce((sum, entry) => sum + entry.pnl, 0);
    const winningTrades = entries.filter(entry => entry.pnl > 0);
    const losingTrades = entries.filter(entry => entry.pnl < 0);
    
    const winRate = (winningTrades.length / entries.length) * 100;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, entry) => sum + entry.pnl, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, entry) => sum + entry.pnl, 0) / losingTrades.length 
      : 0;
    
    const bestTrade = Math.max(...entries.map(entry => entry.pnl), 0);
    const worstTrade = Math.min(...entries.map(entry => entry.pnl), 0);

    // Calculate profitable days and current streak
    const dailyPnL = entries.reduce((acc, entry) => {
      const date = new Date(entry.trade_date).toDateString();
      acc[date] = (acc[date] || 0) + entry.pnl;
      return acc;
    }, {} as Record<string, number>);

    const profitableDays = Object.values(dailyPnL).filter(pnl => pnl > 0).length;
    
    // Calculate current streak (simplified)
    let currentStreak = 0;
    const sortedDates = Object.keys(dailyPnL).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    for (const date of sortedDates) {
      if (dailyPnL[date] > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalPnL,
      winRate,
      totalTrades: entries.length,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      profitableDays,
      currentStreak,
    };
  }, [entries]);

  const chartData = useMemo(() => {
    if (entries.length === 0) return null;

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );

    let runningPnL = 0;
    const labels = [];
    const data = [];

    sortedEntries.forEach((entry, index) => {
      runningPnL += entry.pnl;
      labels.push(`Trade ${index + 1}`);
      data.push(runningPnL);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Equity Curve',
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgb(59, 130, 246)',
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [entries]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return '$' + value.toFixed(2);
          },
        },
      },
    },
  };

  const recentTrades = useMemo(() => {
    return entries
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
      .slice(0, 5);
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/10 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              Journal XX
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Your intelligent trading companion
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="self-start sm:self-auto bg-background/50 backdrop-blur-sm border-border/20 hover:bg-background/70"
          >
            {showStats ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <StatCard
                title="Total P/L"
                value={`$${analytics.totalPnL.toFixed(2)}`}
                icon={DollarSign}
                isPositive={analytics.totalPnL >= 0}
                subtitle={`Avg: $${(analytics.totalPnL / Math.max(analytics.totalTrades, 1)).toFixed(2)}`}
              />
              <StatCard
                title="Win Rate"
                value={`${analytics.winRate.toFixed(1)}%`}
                icon={Target}
                subtitle={`${analytics.totalTrades > 0 ? Math.round((analytics.winRate / 100) * analytics.totalTrades) : 0} wins`}
              />
              <StatCard
                title="Best"
                value={`$${analytics.bestTrade.toFixed(0)}`}
                icon={TrendingUp}
                isPositive={true}
              />
              <StatCard
                title="Worst"
                value={`${analytics.worstTrade.toFixed(0)}`}
                icon={TrendingDown}
                isPositive={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm border border-border/20">
            <TabsTrigger 
              value="overview" 
              className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Equity Curve</span>
              <span className="sm:hidden">Chart</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trades" 
              className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Recent Trades</span>
              <span className="sm:hidden">Trades</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Equity Curve (Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData && chartData.datasets[0].data.length > 0 ? (
                  <div className="h-48 sm:h-64 lg:h-80">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-48 sm:h-64 lg:h-80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        No trades found for this period
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start trading to see your equity curve
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTrades.length > 0 ? (
                  <div className="space-y-3">
                    {recentTrades.map((trade, index) => (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-background/30 backdrop-blur-sm rounded-lg border border-border/10 hover:bg-background/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge 
                            variant="outline" 
                            className="text-xs font-medium shrink-0 bg-primary/10 text-primary border-primary/20"
                          >
                            {trade.asset_ticker}
                          </Badge>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs sm:text-sm text-muted-foreground truncate">
                              {trade.notes || 'No strategy notes'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold text-sm sm:text-base ${
                            trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No recent trades found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TradingJournalApp;
