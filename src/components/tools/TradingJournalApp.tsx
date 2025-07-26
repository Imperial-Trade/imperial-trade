import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar, BarChart3, Eye, EyeOff, TrendingUp, TrendingDown, Target, DollarSign, Activity, PieChart, Clock, Filter, Brain, Star, Lightbulb, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TradeJournalEntry } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { Line, Doughnut } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  isPositive?: boolean;
  subtitle?: string;
  className?: string;
}

const StatCard = ({ title, value, icon: Icon, isPositive, subtitle, className = "" }: StatCardProps) => (
  <Card className={`bg-card/50 backdrop-blur-sm border-border/20 hover:bg-card/70 transition-all duration-200 ${className}`}>
    <CardContent className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Icon className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
        </div>
      </div>
      <div className={`text-lg font-bold mb-1 ${
        isPositive === true ? 'text-emerald-400' : 
        isPositive === false ? 'text-red-400' : 
        'text-foreground'
      }`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

const TradingJournalApp = () => {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [showAiAnalytics, setShowAiAnalytics] = useState(false);

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
        assetBreakdown: {},
        monthlyPnL: 0,
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

    // Asset breakdown
    const assetBreakdown = entries.reduce((acc, entry) => {
      acc[entry.asset_ticker] = (acc[entry.asset_ticker] || 0) + entry.pnl;
      return acc;
    }, {} as Record<string, number>);

    // Monthly P&L
    const currentMonth = startOfMonth(new Date());
    const monthlyEntries = entries.filter(entry => 
      new Date(entry.trade_date) >= currentMonth
    );
    const monthlyPnL = monthlyEntries.reduce((sum, entry) => sum + entry.pnl, 0);

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
      assetBreakdown,
      monthlyPnL,
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
      labels.push(format(new Date(entry.trade_date), 'MMM dd'));
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
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [entries]);

  const assetChartData = useMemo(() => {
    if (!analytics.assetBreakdown || Object.keys(analytics.assetBreakdown).length === 0) return null;

    const assets = Object.keys(analytics.assetBreakdown).slice(0, 6); // Top 6 assets
    const values = assets.map(asset => analytics.assetBreakdown[asset]);
    
    return {
      labels: assets,
      datasets: [
        {
          data: values.map(v => Math.abs(v)),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 101, 101, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [analytics.assetBreakdown]);

  const aiAnalytics = useMemo(() => {
    if (entries.length === 0) return null;

    // Calculate AI-based insights
    const patterns = {
      consistentWinner: analytics.winRate > 60,
      riskManaged: Math.abs(analytics.avgLoss) < analytics.avgWin * 2,
      trendFollower: entries.filter(e => e.pnl > 0).length > entries.filter(e => e.pnl < 0).length,
      overTrader: entries.length > 100,
    };

    const insights = [];
    if (patterns.consistentWinner) insights.push("Consistent Winner");
    if (patterns.riskManaged) insights.push("Good Risk Management");
    if (patterns.trendFollower) insights.push("Trend Follower");
    if (patterns.overTrader) insights.push("High Volume Trader");

    const overallScore = Math.min(10, Math.round(
      (analytics.winRate / 10) + 
      (patterns.riskManaged ? 2 : 0) + 
      (patterns.consistentWinner ? 2 : 0) + 
      (analytics.totalPnL > 0 ? 2 : 0)
    ));

    return {
      overallScore,
      insights,
      strengths: patterns.consistentWinner 
        ? "Strong win rate indicates good trade selection" 
        : "Focus on improving trade selection criteria",
      improvements: patterns.riskManaged 
        ? "Consider scaling position sizes for better returns"
        : "Implement stricter risk management rules",
      recommendations: [
        "Continue following your current strategy",
        "Document setup criteria for winning trades",
        "Review losing trades for pattern recognition"
      ]
    };
  }, [entries, analytics]);

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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
          padding: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: $${value.toFixed(2)}`;
          },
        },
      },
    },
  };

  const recentTrades = useMemo(() => {
    return entries
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
      .slice(0, 10);
  }, [entries]);

  const filteredTrades = useMemo(() => {
    let filtered = recentTrades;
    
    if (selectedAsset !== 'all') {
      filtered = filtered.filter(trade => trade.asset_ticker === selectedAsset);
    }
    
    if (selectedDate) {
      filtered = filtered.filter(trade => 
        isSameDay(new Date(trade.trade_date), selectedDate)
      );
    }
    
    return filtered;
  }, [recentTrades, selectedAsset, selectedDate]);

  const availableAssets = useMemo(() => {
    return [...new Set(entries.map(entry => entry.asset_ticker))];
  }, [entries]);

  const calendarDays = useMemo(() => {
    const currentDate = new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const tradeDays = entries.reduce((acc, entry) => {
      const dateKey = format(new Date(entry.trade_date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = { pnl: 0, count: 0 };
      }
      acc[dateKey].pnl += entry.pnl;
      acc[dateKey].count += 1;
      return acc;
    }, {} as Record<string, { pnl: number; count: number }>);
    
    return days.map(day => ({
      date: day,
      dateKey: format(day, 'yyyy-MM-dd'),
      trades: tradeDays[format(day, 'yyyy-MM-dd')] || null,
    }));
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/10 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Mobile-optimized Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent truncate">
                Journal XX
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your intelligent trading companion
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="shrink-0 bg-background/50 backdrop-blur-sm border-border/20 hover:bg-background/70"
            >
              {showStats ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline ml-2">{showStats ? 'Hide' : 'Show'} Stats</span>
            </Button>
          </div>
        </motion.div>

        {/* Mobile-optimized Stats Cards */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Primary Stats Row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <StatCard
                  title="Total P/L"
                  value={`$${analytics.totalPnL.toFixed(2)}`}
                  icon={DollarSign}
                  isPositive={analytics.totalPnL >= 0}
                  subtitle={`${analytics.totalTrades} trades`}
                />
                <StatCard
                  title="Win Rate"
                  value={`${analytics.winRate.toFixed(1)}%`}
                  icon={Target}
                  subtitle={`${Math.round((analytics.winRate / 100) * analytics.totalTrades)} wins`}
                />
              </div>
              
              {/* Secondary Stats Row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <StatCard
                  title="Monthly P/L"
                  value={`$${analytics.monthlyPnL.toFixed(2)}`}
                  icon={Calendar}
                  isPositive={analytics.monthlyPnL >= 0}
                  subtitle={format(new Date(), 'MMM yyyy')}
                />
                <StatCard
                  title="Win Streak"
                  value={`${analytics.currentStreak}`}
                  icon={TrendingUp}
                  subtitle={`${analytics.profitableDays} profitable days`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile-optimized Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/20 h-auto">
            <TabsTrigger 
              value="overview" 
              className="text-xs p-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col items-center gap-1"
            >
              <Activity className="w-3 h-3" />
              <span>Chart</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="text-xs p-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              className="text-xs p-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col items-center gap-1"
            >
              <PieChart className="w-3 h-3" />
              <span>Assets</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trades" 
              className="text-xs p-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col items-center gap-1"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Trades</span>
            </TabsTrigger>
          </TabsList>

          {/* Equity Curve Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Equity Curve
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData && chartData.datasets[0].data.length > 0 ? (
                  <div className="h-48 sm:h-64">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-48 sm:h-64 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <BarChart3 className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                      <p className="text-sm text-muted-foreground">No trades to display</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Trading Calendar - {format(new Date(), 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, dateKey, trades }) => (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(isSameDay(date, selectedDate || new Date()) ? null : date)}
                      className={`
                        aspect-square p-1 rounded-md text-xs transition-all duration-200 relative
                        ${isSameDay(date, selectedDate || new Date()) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted/50'
                        }
                        ${trades 
                          ? trades.pnl >= 0 
                            ? 'bg-emerald-500/20 border border-emerald-500/40' 
                            : 'bg-red-500/20 border border-red-500/40'
                          : 'bg-background/50 border border-border/20'
                        }
                      `}
                    >
                      <span className="block">{format(date, 'd')}</span>
                      {trades && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current opacity-60" />
                      )}
                    </button>
                  ))}
                </div>
                {selectedDate && (
                  <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border/20">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {format(selectedDate, 'MMMM dd, yyyy')}
                    </p>
                    {calendarDays.find(d => isSameDay(d.date, selectedDate))?.trades ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Trades: {calendarDays.find(d => isSameDay(d.date, selectedDate))?.trades?.count}
                        </p>
                        <p className={`text-sm font-medium ${
                          (calendarDays.find(d => isSameDay(d.date, selectedDate))?.trades?.pnl || 0) >= 0 
                            ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          P/L: ${calendarDays.find(d => isSameDay(d.date, selectedDate))?.trades?.pnl?.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No trades on this date</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab with Toggle */}
          <TabsContent value="assets" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    {showAiAnalytics ? <Brain className="w-4 h-4" /> : <PieChart className="w-4 h-4" />}
                    {showAiAnalytics ? 'AI Analytics' : 'Asset Performance'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assets</span>
                    <Switch
                      checked={showAiAnalytics}
                      onCheckedChange={setShowAiAnalytics}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-xs text-muted-foreground">AI</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {showAiAnalytics ? (
                    <motion.div
                      key="ai-analytics"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {aiAnalytics ? (
                        <>
                          {/* AI Score Card */}
                          <div className="text-center p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Brain className="w-5 h-5 text-primary" />
                              <span className="text-lg font-bold">AI Trading Score</span>
                            </div>
                            <div className={`text-3xl font-bold mb-2 ${
                              aiAnalytics.overallScore >= 8 ? 'text-emerald-400' :
                              aiAnalytics.overallScore >= 6 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {aiAnalytics.overallScore}/10
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {aiAnalytics.insights.map((insight, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {insight}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* AI Insights */}
                          <div className="space-y-3">
                            <div className="p-3 bg-background/30 rounded-lg border border-border/20">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-medium">Strengths</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{aiAnalytics.strengths}</p>
                            </div>

                            <div className="p-3 bg-background/30 rounded-lg border border-border/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium">Improvements</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{aiAnalytics.improvements}</p>
                            </div>

                            <div className="p-3 bg-background/30 rounded-lg border border-border/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">Recommendations</span>
                              </div>
                              <div className="space-y-1">
                                {aiAnalytics.recommendations.map((rec, index) => (
                                  <p key={index} className="text-xs text-muted-foreground">• {rec}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Brain className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No trading data for AI analysis</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="asset-chart"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {assetChartData ? (
                        <div className="space-y-4">
                          <div className="h-48">
                            <Doughnut data={assetChartData} options={doughnutOptions} />
                          </div>
                          <div className="space-y-2">
                            {Object.entries(analytics.assetBreakdown)
                              .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                              .slice(0, 6)
                              .map(([asset, pnl]) => (
                                <div key={asset} className="flex items-center justify-between p-2 bg-background/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {asset}
                                    </Badge>
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <PieChart className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                            <p className="text-sm text-muted-foreground">No asset data available</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Recent Trades
                </CardTitle>
                {/* Mobile Filters */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="text-xs bg-background border border-border rounded px-2 py-1"
                  >
                    <option value="all">All Assets</option>
                    {availableAssets.map(asset => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                      className="text-xs h-7"
                    >
                      Clear Date
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredTrades.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTrades.map((trade, index) => (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-background/30 backdrop-blur-sm rounded-lg border border-border/10 hover:bg-background/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {trade.asset_ticker}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground truncate">
                              {format(new Date(trade.trade_date), 'MMM dd')}
                            </p>
                            {trade.notes && (
                              <p className="text-xs text-muted-foreground truncate">
                                {trade.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${
                          trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No trades found</p>
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
