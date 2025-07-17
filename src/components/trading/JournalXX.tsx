import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  TrendingUp,
  Target,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Brain,
  Timer,
  TrendingDown,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface JournalMetrics {
  totalPL: number;
  avgPL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  bestTrades: number;
}

interface Trade {
  id: string;
  type: 'LONG' | 'SHORT';
  status: 'paused' | 'closed';
  pnl: number;
  asset: string;
  date: string;
}

interface AIInsight {
  type: 'strategy' | 'timing' | 'psychology' | 'risk';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const JournalXX: React.FC = () => {
  const [showStats, setShowStats] = useState(true);
  const [currentView, setCurrentView] = useState<'Today' | 'Week' | 'Month' | 'Year' | 'All'>('Week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Sample data - replace with actual data from your API
  const metrics: JournalMetrics = {
    totalPL: 3702.00,
    avgPL: 462.75,
    winRate: 62.5,
    profitFactor: 2.82,
    totalTrades: 8,
    bestTrades: 3000
  };

  const trades: Trade[] = [
    { id: '1', type: 'LONG', status: 'paused', pnl: 1234.00, asset: 'EURUSD', date: '2025-01-17' },
    { id: '2', type: 'SHORT', status: 'closed', pnl: -300.00, asset: 'GBPUSD', date: '2025-01-16' },
    { id: '3', type: 'LONG', status: 'closed', pnl: -500.00, asset: 'USDJPY', date: '2025-01-15' },
    { id: '4', type: 'LONG', status: 'paused', pnl: 302.00, asset: 'AUDUSD', date: '2025-01-14' },
    { id: '5', type: 'LONG', status: 'paused', pnl: 600.00, asset: 'USDCAD', date: '2025-01-13' }
  ];

  const aiInsights: AIInsight[] = [
    {
      type: 'strategy',
      title: 'Best Strategy',
      description: 'Breakout trades show 80% win rate during London session',
      icon: Target,
      color: 'text-accentGreen-sage'
    },
    {
      type: 'timing',
      title: 'Timing Insight',
      description: 'Your performance peaks during European overlap hours',
      icon: Timer,
      color: 'text-feature-blue'
    },
    {
      type: 'psychology',
      title: 'Psychology Tip',
      description: 'Confident entries yield 23% higher profits than anxious ones',
      icon: Brain,
      color: 'text-orache-warm'
    },
    {
      type: 'risk',
      title: 'Risk Management',
      description: 'Consider 0.5% position sizing for setups below 2:1 R/R',
      icon: AlertTriangle,
      color: 'text-accent-red'
    }
  ];

  const getCalendarDays = () => {
    const days = [];
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Add days from previous month to fill the week
    const startDay = startDate.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - i - 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Add days from current month
    for (let day = 1; day <= endDate.getDate(); day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Add days from next month to fill the week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  const getDayPnL = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = trades.filter(trade => trade.date === dateStr);
    return dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${isNegative ? '-' : ''}$${formatted}`;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trading Journal</h1>
          <p className="text-muted-foreground">Your intelligent trading companion</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowStats(!showStats)}
          className="transition-all duration-200"
        >
          {showStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 hover:border-accent-green/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle>
            <TrendingUp className="h-4 w-4 text-accentGreen-sage" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accentGreen-sage">{formatCurrency(metrics.totalPL)}</div>
            <p className="text-xs text-muted-foreground">Avg {formatCurrency(metrics.avgPL)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-feature-blue/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-feature-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-feature-blue">{metrics.winRate}%</div>
            <p className="text-xs text-muted-foreground">5 wins</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-orache-warm/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
            <BarChart3 className="h-4 w-4 text-orache-warm" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orache-warm">{metrics.profitFactor}</div>
            <p className="text-xs text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-accent-gold/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-accent-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-gold">{metrics.totalTrades}</div>
            <p className="text-xs text-muted-foreground">Best ${metrics.bestTrades}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve & Calendar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equity Curve */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accentGreen-sage" />
                  Equity Curve (Week)
                </CardTitle>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Total</p>
                  <p className="text-xl font-bold text-accentGreen-sage">{formatCurrency(metrics.totalPL)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Equity Curve Chart Placeholder</p>
              </div>
            </CardContent>
          </Card>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['Today', 'Week', 'Month', 'Year', 'All'] as const).map((view) => (
                <Button
                  key={view}
                  variant={currentView === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentView(view)}
                  className="transition-all duration-200"
                >
                  {view}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-32 text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((day, index) => {
                  const pnl = getDayPnL(day.date);
                  const hasData = pnl !== 0;
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square p-1 text-center text-sm rounded-md cursor-pointer transition-all duration-200
                        ${!day.isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                        ${hasData ? (pnl > 0 ? 'bg-accentGreen-sage/20 text-accentGreen-sage' : 'bg-accent-red/20 text-accent-red') : 'hover:bg-muted/50'}
                      `}
                    >
                      <div className="font-medium">{day.date.getDate()}</div>
                      {hasData && (
                        <div className="text-xs font-bold">
                          {pnl > 0 ? '+' : ''}{Math.round(pnl)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Stats Panel */}
        {showStats && (
          <div className="space-y-6">
            {/* Assets & AI Analytics Toggle */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">AI Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <insight.icon className={`h-4 w-4 ${insight.color}`} />
                      <span className="font-medium text-sm">{insight.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Trades</CardTitle>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Trade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <Badge variant={trade.status === 'paused' ? 'secondary' : 'outline'}>
                    {trade.status}
                  </Badge>
                  <span className="font-medium">{trade.type}</span>
                  <span className="text-muted-foreground">{trade.asset}</span>
                </div>
                <div className={`font-bold ${trade.pnl >= 0 ? 'text-accentGreen-sage' : 'text-accent-red'}`}>
                  {formatCurrency(trade.pnl)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalXX;