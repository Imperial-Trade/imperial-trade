import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Plus,
  ArrowLeft,
  Settings,
  Brain,
  Target,
  DollarSign,
  Percent,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

// Types
interface Trade {
  id: string;
  date: string;
  asset: string;
  direction: 'long' | 'short';
  outcome: 'win' | 'loss';
  pnl: number;
  strategy?: string;
  emotion?: string;
  session?: string;
  notes?: string;
  screenshot?: string;
}

interface DashboardMetrics {
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
}

type ViewType = 'today' | 'week' | 'month' | 'year' | 'all';

// Sample data
const sampleTrades: Trade[] = [
  {
    id: '1',
    date: '2024-01-15',
    asset: 'EURUSD',
    direction: 'long',
    outcome: 'win',
    pnl: 250,
    strategy: 'Breakout',
    emotion: 'Confident',
    session: 'London',
    notes: 'Clean breakout above resistance'
  },
  {
    id: '2',
    date: '2024-01-15',
    asset: 'GBPUSD',
    direction: 'short',
    outcome: 'loss',
    pnl: -150,
    strategy: 'Reversal',
    emotion: 'Anxious',
    session: 'New York',
    notes: 'False signal, market continued higher'
  }
];

export const TradingJournalApp: React.FC = () => {
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [trades, setTrades] = useState<Trade[]>(sampleTrades);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate dashboard metrics
  const calculateMetrics = (filteredTrades: Trade[]): DashboardMetrics => {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.outcome === 'win').length;
    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfits = filteredTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLosses = Math.abs(filteredTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    
    return {
      totalPnL,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
      profitFactor: grossLosses > 0 ? grossProfits / grossLosses : 0,
      totalTrades
    };
  };

  const metrics = calculateMetrics(trades);

  // Dashboard Metrics Component
  const DashboardMetrics: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card className={cn(
        "border-2 transition-all duration-300",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
          : "bg-white border-slate-200 hover:border-slate-300"
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
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
          : "bg-white border-slate-200 hover:border-slate-300"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-blue-500">
                {metrics.winRate.toFixed(1)}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
          : "bg-white border-slate-200 hover:border-slate-300"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className="text-2xl font-bold text-purple-500">
                {metrics.profitFactor.toFixed(2)}
              </p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2 transition-all duration-300",
        theme === 'dark' 
          ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
          : "bg-white border-slate-200 hover:border-slate-300"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold text-orange-500">
                {metrics.totalTrades}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Calendar Component
  const CalendarView: React.FC = () => {
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="h-20" />);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrades = trades.filter(t => t.date === dateStr);
      const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const isFuture = new Date(dateStr) > today;
      
      days.push(
        <div
          key={day}
          className={cn(
            "h-20 border border-border p-2 cursor-pointer transition-all duration-200",
            theme === 'dark' 
              ? "hover:bg-slate-800/50" 
              : "hover:bg-slate-50",
            isFuture && "opacity-50 cursor-not-allowed",
            dayTrades.length > 0 && (dayPnL >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")
          )}
          onClick={() => !isFuture && dayTrades.length > 0 && setSelectedDate(dateStr)}
        >
          <div className="text-sm font-medium">{day}</div>
          {dayTrades.length > 0 && (
            <div className={cn(
              "text-xs font-bold mt-1",
              dayPnL >= 0 ? "text-green-500" : "text-red-500"
            )}>
              ${dayPnL.toFixed(0)}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  // Stats Panel Component
  const StatsPanel: React.FC = () => (
    <AnimatePresence>
      {showStats && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <Card className={cn(
            "h-96 ml-4",
            theme === 'dark' 
              ? "bg-slate-900/80 border-slate-700" 
              : "bg-white border-slate-200"
          )}>
            <CardHeader>
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">AI Insights</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-green-600">Best Strategy</p>
                    <p className="text-muted-foreground">Breakout trades show 80% win rate</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-blue-600">Performance Tip</p>
                    <p className="text-muted-foreground">London session trades perform best</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-orange-600">Risk Management</p>
                    <p className="text-muted-foreground">Consider reducing position size when anxious</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Day View Component
  const DayView: React.FC<{ date: string }> = ({ date }) => {
    const dayTrades = trades.filter(t => t.date === date);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Calendar
            </Button>
            <h2 className="text-2xl font-bold">{new Date(date).toLocaleDateString()}</h2>
          </div>
          <Button
            onClick={() => setShowAddTradeModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        </div>

        <div className="grid gap-4">
          {dayTrades.map(trade => (
            <Card key={trade.id} className={cn(
              "border-2 transition-all duration-300",
              theme === 'dark' 
                ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
                : "bg-white border-slate-200 hover:border-slate-300"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                        {trade.asset}
                      </Badge>
                      <Badge variant="outline">
                        {trade.direction.toUpperCase()}
                      </Badge>
                      <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                        {trade.outcome.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{trade.notes}</p>
                    {trade.strategy && (
                      <p className="text-sm"><strong>Strategy:</strong> {trade.strategy}</p>
                    )}
                    {trade.emotion && (
                      <p className="text-sm"><strong>Emotion:</strong> {trade.emotion}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-2xl font-bold",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      ${trade.pnl.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{trade.session} Session</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  };

  // Main Dashboard View
  const DashboardView: React.FC = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Journal</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2"
        >
          {showStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </Button>
      </div>

      {/* Dashboard Metrics */}
      <DashboardMetrics metrics={metrics} />

      {/* Main Content Row */}
      <div className="flex gap-4">
        {/* Left Side - Analytics and Calendar */}
        <div className="flex-1 space-y-6">
          {/* Performance Graph */}
          <Card className={cn(
            "h-96",
            theme === 'dark' 
              ? "bg-slate-900/80 border-slate-700" 
              : "bg-white border-slate-200"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Equity curve chart will render here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['today', 'week', 'month', 'year', 'all'] as ViewType[]).map(view => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="capitalize"
                >
                  {view}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar */}
          {currentView === 'month' && (
            <Card className={cn(
              theme === 'dark' 
                ? "bg-slate-900/80 border-slate-700" 
                : "bg-white border-slate-200"
            )}>
              <CardContent className="p-6">
                <CalendarView />
              </CardContent>
            </Card>
          )}

          {/* Trade Log */}
          <Card className={cn(
            theme === 'dark' 
              ? "bg-slate-900/80 border-slate-700" 
              : "bg-white border-slate-200"
          )}>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trades.slice(0, 5).map(trade => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                        {trade.asset}
                      </Badge>
                      <span className="text-sm">{trade.direction.toUpperCase()}</span>
                    </div>
                    <span className={cn(
                      "font-bold",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      ${trade.pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Stats Panel */}
        <StatsPanel />
      </div>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen p-6 transition-colors duration-300",
      theme === 'dark' 
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" 
        : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
    )}>
      <AnimatePresence mode="wait">
        {selectedDate ? (
          <DayView key="day-view" date={selectedDate} />
        ) : (
          <DashboardView key="dashboard-view" />
        )}
      </AnimatePresence>
    </div>
  );
};