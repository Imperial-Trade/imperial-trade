import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  EyeOff,
  Upload,
  Zap,
  MapPin,
  Clock,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enhanced Types
interface Trade {
  id: string;
  user_id: string;
  date: string;
  asset: string;
  direction: 'long' | 'short';
  outcome: 'win' | 'loss';
  pnl: number;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  strategy?: string;
  emotion?: string;
  session?: 'sydney' | 'tokyo' | 'london' | 'newyork';
  notes?: string;
  screenshot_url?: string;
  ai_feedback?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardMetrics {
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}

type ViewType = 'today' | 'week' | 'month' | 'year' | 'all';

interface JournalState {
  currentDate: Date;
  currentFilter: ViewType;
  journalEntries: Map<string, Trade[]>;
  selectedDate: string | null;
  isLoading: boolean;
  isDayViewActive: boolean;
}

// AI Analysis Strategies
const TRADING_STRATEGIES = [
  'Breakout', 'Reversal', 'Trend Following', 'Support/Resistance', 
  'Fibonacci', 'Moving Average', 'RSI Divergence', 'News Trading',
  'Scalping', 'Swing Trading', 'Day Trading', 'Custom Strategy'
];

const EMOTIONS = [
  'Confident', 'Anxious', 'Greedy', 'Fearful', 'Neutral',
  'Excited', 'Frustrated', 'Disciplined', 'Impulsive', 'Focused'
];

const SESSIONS = [
  { value: 'sydney', label: 'Sydney (9PM-6AM GMT)' },
  { value: 'tokyo', label: 'Tokyo (11PM-8AM GMT)' },
  { value: 'london', label: 'London (7AM-4PM GMT)' },
  { value: 'newyork', label: 'New York (12PM-9PM GMT)' }
];

// Sample data for demo with multiple trades across different time periods
const sampleTrades: Trade[] = [
  {
    id: '1',
    user_id: 'demo-user',
    date: '2024-01-15',
    asset: 'EURUSD',
    direction: 'long',
    outcome: 'win',
    pnl: 250,
    entry_price: 1.0850,
    exit_price: 1.0875,
    position_size: 1000,
    strategy: 'Breakout',
    emotion: 'Confident',
    session: 'london',
    notes: 'Clean breakout above resistance level. Textbook setup.',
    ai_feedback: 'Excellent trade execution. Your confidence in breakout setups during London session shows strong pattern recognition.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'demo-user',
    date: '2024-01-16',
    asset: 'GBPUSD',
    direction: 'short',
    outcome: 'loss',
    pnl: -120,
    entry_price: 1.2750,
    exit_price: 1.2780,
    position_size: 800,
    strategy: 'Reversal',
    emotion: 'Frustrated',
    session: 'newyork',
    notes: 'False breakout. Should have waited for confirmation.',
    ai_feedback: 'Consider using additional confirmation signals for reversal trades. Your frustration might have led to early exit.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    user_id: 'demo-user',
    date: '2024-01-17',
    asset: 'USDJPY',
    direction: 'long',
    outcome: 'win',
    pnl: 180,
    entry_price: 148.50,
    exit_price: 149.20,
    position_size: 1200,
    strategy: 'Trend Following',
    emotion: 'Confident',
    session: 'tokyo',
    notes: 'Perfect trend continuation setup.',
    ai_feedback: 'Excellent trend following execution. Your confidence in trending markets is a strength.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    user_id: 'demo-user',
    date: '2024-01-18',
    asset: 'EURUSD',
    direction: 'short',
    outcome: 'win',
    pnl: 320,
    entry_price: 1.0890,
    exit_price: 1.0850,
    position_size: 1500,
    strategy: 'Support/Resistance',
    emotion: 'Disciplined',
    session: 'london',
    notes: 'Perfect rejection at resistance level.',
    ai_feedback: 'Outstanding discipline in waiting for the perfect setup at key resistance.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    user_id: 'demo-user',
    date: '2024-01-19',
    asset: 'AUDUSD',
    direction: 'long',
    outcome: 'loss',
    pnl: -95,
    entry_price: 0.6750,
    exit_price: 0.6730,
    position_size: 900,
    strategy: 'News Trading',
    emotion: 'Anxious',
    session: 'sydney',
    notes: 'News went against expectation.',
    ai_feedback: 'News trading requires quick decision-making. Consider position sizing for volatile events.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    user_id: 'demo-user',
    date: '2024-01-22',
    asset: 'GBPJPY',
    direction: 'long',
    outcome: 'win',
    pnl: 275,
    entry_price: 188.50,
    exit_price: 190.00,
    position_size: 1100,
    strategy: 'Breakout',
    emotion: 'Focused',
    session: 'london',
    notes: 'Clean breakout with volume confirmation.',
    ai_feedback: 'Great use of volume confirmation. Your focus during London session shows consistent performance.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const TradingJournalApp: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Enhanced state management
  const [journalState, setJournalState] = useState<JournalState>({
    currentDate: new Date(),
    currentFilter: 'month',
    journalEntries: new Map(),
    selectedDate: null,
    isLoading: false,
    isDayViewActive: false
  });
  
  const [trades, setTrades] = useState<Trade[]>(sampleTrades);
  const [showStats, setShowStats] = useState(true);
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({});
  const dayViewRef = useRef<HTMLDivElement>(null);

  // Real-time database sync with Supabase
  const setupJournalListener = useCallback(async () => {
    if (!user) return;

    setJournalState(prev => ({ ...prev, isLoading: true }));

    try {
      // Initial load
      const { data: initialTrades, error } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });

      if (error) throw error;

      const mappedTrades: Trade[] = initialTrades?.map(trade => ({
        id: trade.id,
        user_id: trade.user_id,
        date: trade.trade_date,
        asset: trade.asset_ticker,
        direction: trade.trade_type?.toLowerCase() as 'long' | 'short' || 'long',
        outcome: trade.pnl >= 0 ? 'win' : 'loss',
        pnl: trade.pnl,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        position_size: trade.position_size,
        strategy: undefined,
        emotion: undefined,
        session: undefined,
        notes: trade.notes,
        screenshot_url: trade.screenshot_url,
        ai_feedback: trade.ai_positive_feedback,
        created_at: trade.created_at,
        updated_at: trade.updated_at
      })) || [];

      setTrades(mappedTrades);

      // Setup real-time listener
      const channel = supabase
        .channel('trade_journal_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'trade_journal_entries',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // Refetch data when changes occur
          supabase
            .from('trade_journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('trade_date', { ascending: false })
            .then(({ data }) => {
              if (data) {
                const updatedTrades: Trade[] = data.map(trade => ({
                  id: trade.id,
                  user_id: trade.user_id,
                  date: trade.trade_date,
                  asset: trade.asset_ticker,
                  direction: trade.trade_type?.toLowerCase() as 'long' | 'short' || 'long',
                  outcome: trade.pnl >= 0 ? 'win' : 'loss',
                  pnl: trade.pnl,
                  entry_price: trade.entry_price,
                  exit_price: trade.exit_price,
                  position_size: trade.position_size,
                  strategy: undefined,
                  emotion: undefined,
                  session: undefined,
                  notes: trade.notes,
                  screenshot_url: trade.screenshot_url,
                  ai_feedback: trade.ai_positive_feedback,
                  created_at: trade.created_at,
                  updated_at: trade.updated_at
                }));
                setTrades(updatedTrades);
              }
            });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up journal listener:', error);
      toast({
        title: "Error",
        description: "Failed to sync with database",
        variant: "destructive"
      });
    } finally {
      setJournalState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, toast]);

  useEffect(() => {
    setupJournalListener();
  }, [setupJournalListener]);

  // Enhanced metrics calculation
  const calculateMetrics = (filteredTrades: Trade[]): DashboardMetrics => {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.outcome === 'win');
    const losses = filteredTrades.filter(t => t.outcome === 'loss');
    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfits = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    
    return {
      totalPnL,
      winRate: totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0,
      profitFactor: grossLosses > 0 ? grossProfits / grossLosses : 0,
      totalTrades,
      avgWin: wins.length > 0 ? grossProfits / wins.length : 0,
      avgLoss: losses.length > 0 ? grossLosses / losses.length : 0,
      bestTrade: Math.max(...filteredTrades.map(t => t.pnl), 0),
      worstTrade: Math.min(...filteredTrades.map(t => t.pnl), 0)
    };
  };

  // Filter trades based on current view
  const getFilteredTrades = useCallback(() => {
    const now = new Date();
    const currentDate = journalState.currentDate;
    
    switch (journalState.currentFilter) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        return trades.filter(t => t.date === today);
      
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return trades.filter(t => {
          const tradeDate = new Date(t.date);
          return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
        });
      
      case 'month':
        return trades.filter(t => {
          const tradeDate = new Date(t.date);
          return tradeDate.getMonth() === currentDate.getMonth() && 
                 tradeDate.getFullYear() === currentDate.getFullYear();
        });
      
      case 'year':
        return trades.filter(t => {
          const tradeDate = new Date(t.date);
          return tradeDate.getFullYear() === currentDate.getFullYear();
        });
      
      case 'all':
      default:
        return trades;
    }
  }, [trades, journalState.currentFilter, journalState.currentDate]);

  const filteredTrades = getFilteredTrades();
  const metrics = calculateMetrics(filteredTrades);

  // Generate equity curve data
  const getEquityCurveData = useCallback(() => {
    const sortedTrades = filteredTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulativePnL = 0;
    
    return sortedTrades.map((trade, index) => {
      cumulativePnL += trade.pnl;
      return {
        date: trade.date,
        pnl: cumulativePnL,
        tradePnL: trade.pnl,
        tradeNumber: index + 1
      };
    });
  }, [filteredTrades]);

  // Centralized state update function (the "brain" of the app)
  const updateView = useCallback((newFilter?: ViewType, newDate?: Date) => {
    setJournalState(prev => ({
      ...prev,
      currentFilter: newFilter || prev.currentFilter,
      currentDate: newDate || prev.currentDate,
      selectedDate: null // Reset selected date when changing views
    }));
  }, []);

  // Handle date click with smooth transition animation
  const handleDateClick = useCallback((dateStr: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    if (dayViewRef.current) {
      dayViewRef.current.style.transformOrigin = `${rect.left + rect.width/2}px ${rect.top + rect.height/2}px`;
    }
    
    setJournalState(prev => ({
      ...prev,
      selectedDate: dateStr,
      isDayViewActive: true
    }));
  }, []);

  // AI Analysis Function
  const getAISummaryForTrade = async (trade: Partial<Trade>) => {
    try {
      const prompt = `Analyze this trading data and provide insights:
Asset: ${trade.asset}
Direction: ${trade.direction}
Outcome: ${trade.outcome}
P/L: $${trade.pnl}
Strategy: ${trade.strategy || 'Not specified'}
Emotion: ${trade.emotion || 'Not specified'}
Session: ${trade.session || 'Not specified'}
Notes: ${trade.notes || 'None'}

Please provide a brief analysis focusing on what went well, what could be improved, and any patterns you notice.`;

      const response = await supabase.functions.invoke('ai-trade-analysis', {
        body: { prompt }
      });

      return response.data?.analysis || 'Analysis pending...';
    } catch (error) {
      console.error('AI analysis failed:', error);
      return 'AI analysis temporarily unavailable.';
    }
  };

  // Save trade with AI analysis
  const saveTrade = async (tradeData: Partial<Trade>) => {
    if (!user) return;

    try {
      const tradeEntry = {
        user_id: user.id,
        asset_ticker: tradeData.asset,
        trade_type: (tradeData.direction === 'long' ? 'Long' : 'Short') as 'Long' | 'Short',
        pnl: tradeData.pnl || 0,
        trade_date: tradeData.date,
        entry_price: tradeData.entry_price,
        exit_price: tradeData.exit_price,
        position_size: tradeData.position_size,
        notes: tradeData.notes,
        screenshot_url: tradeData.screenshot_url
      };

      const { data, error } = await supabase
        .from('trade_journal_entries')
        .insert([tradeEntry])
        .select()
        .single();

      if (error) throw error;

      // Generate AI feedback asynchronously
      getAISummaryForTrade(tradeData).then(async (feedback) => {
        await supabase
          .from('trade_journal_entries')
          .update({ ai_positive_feedback: feedback })
          .eq('id', data.id);
      });

      toast({
        title: "Trade Saved",
        description: "Your trade has been logged successfully",
      });
      
      setShowAddTradeModal(false);
      setNewTrade({});
    } catch (error) {
      console.error('Error saving trade:', error);
      toast({
        title: "Error",
        description: "Failed to save trade",
        variant: "destructive"
      });
    }
  };

  // Enhanced Dashboard Metrics with more insights
  const EnhancedDashboardMetrics: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => (
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

  // Dynamic Calendar with multiple view types
  const DynamicCalendarView: React.FC = () => {
    const today = new Date();
    
    if (journalState.currentFilter === 'today' || journalState.currentFilter === 'all') {
      return (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {journalState.currentFilter === 'today' ? 'Today\'s trades' : 'All trades'} view
          </p>
        </div>
      );
    }

    if (journalState.currentFilter === 'week') {
      // Week view - single row of 7 days
      const startOfWeek = new Date(journalState.currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTrades = trades.filter(t => t.date === dateStr);
        const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
        const isFuture = date > today;
        
        weekDays.push(
          <div
            key={i}
            className={cn(
              "h-24 border border-border p-2 cursor-pointer transition-all duration-200",
              theme === 'dark' ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
              isFuture && "opacity-50 cursor-not-allowed",
              dayTrades.length > 0 && (dayPnL >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")
            )}
            onClick={(e) => !isFuture && dayTrades.length > 0 && handleDateClick(dateStr, e)}
          >
            <div className="text-sm font-medium">{date.getDate()}</div>
            <div className="text-xs text-muted-foreground">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
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
      
      return <div className="grid grid-cols-7 gap-2">{weekDays}</div>;
    }

    if (journalState.currentFilter === 'year') {
      // Year view - 4x3 grid of mini-months
      const year = journalState.currentDate.getFullYear();
      const months = [];
      
      for (let month = 0; month < 12; month++) {
        const monthTrades = trades.filter(t => {
          const tradeDate = new Date(t.date);
          return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
        });
        const monthPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'short' });
        
        months.push(
          <div
            key={month}
            className={cn(
              "h-20 border border-border p-2 cursor-pointer transition-all duration-200 flex flex-col justify-center items-center",
              theme === 'dark' ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
              monthTrades.length > 0 && (monthPnL >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")
            )}
            onClick={() => updateView('month', new Date(year, month, 1))}
          >
            <div className="text-sm font-medium">{monthName}</div>
            {monthTrades.length > 0 && (
              <div className={cn(
                "text-xs font-bold",
                monthPnL >= 0 ? "text-green-500" : "text-red-500"
              )}>
                ${monthPnL.toFixed(0)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{monthTrades.length} trades</div>
          </div>
        );
      }
      
      return <div className="grid grid-cols-4 gap-3">{months}</div>;
    }

    // Default month view
    const currentMonth = journalState.currentDate.getMonth();
    const currentYear = journalState.currentDate.getFullYear();
    
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
            theme === 'dark' ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
            isFuture && "opacity-50 cursor-not-allowed",
            dayTrades.length > 0 && (dayPnL >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30")
          )}
          onClick={(e) => !isFuture && dayTrades.length > 0 && handleDateClick(dateStr, e)}
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

  // Get most traded assets
  const getMostTradedAssets = () => {
    const assetCounts = trades.reduce((acc, trade) => {
      acc[trade.asset] = (acc[trade.asset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(assetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));
  };

  // State for analytics toggle
  const [analyticsView, setAnalyticsView] = useState<'ai' | 'most-traded'>('ai');

  // Enhanced Equity Curve Chart Component with Robinhood-style design
  const EquityCurveChart: React.FC<{ data: Array<{date: string, pnl: number, tradePnL: number, tradeNumber: number}> }> = ({ data }) => {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No trades found for this period</p>
            <p className="text-sm">Start trading to see your equity curve</p>
          </div>
        </div>
      );
    }

    const maxPnL = Math.max(...data.map(d => d.pnl));
    const minPnL = Math.min(...data.map(d => d.pnl));
    const range = maxPnL - minPnL || 100; // Avoid division by zero
    const padding = range * 0.15; // Increased padding for better visuals
    const chartHeight = 200;
    const chartPadding = 20;
    const chartInnerHeight = chartHeight - (chartPadding * 2);

    // Enhanced smooth curve generation using Catmull-Rom splines
    const generateSmoothPath = () => {
      if (data.length < 2) return '';

      const points = data.map((point, index) => ({
        x: chartPadding + (index / Math.max(data.length - 1, 1)) * (100 - chartPadding * 2),
        y: chartPadding + chartInnerHeight - ((point.pnl - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight
      }));

      if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
      }

      let path = `M ${points[0].x} ${points[0].y}`;

      // Create smooth curves using cubic bezier
      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        
        // Calculate control points for smooth curve
        const tension = 0.3;
        const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * tension;
        const cp1y = prevPoint.y;
        const cp2x = currentPoint.x - (currentPoint.x - prevPoint.x) * tension;
        const cp2y = currentPoint.y;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currentPoint.x} ${currentPoint.y}`;
      }

      return path;
    };

    // Generate area path for gradient fill
    const generateAreaPath = () => {
      const curvePath = generateSmoothPath();
      if (!curvePath) return '';

      const lastPoint = data.length > 0 ? {
        x: chartPadding + ((data.length - 1) / Math.max(data.length - 1, 1)) * (100 - chartPadding * 2),
        y: chartPadding + chartInnerHeight - ((data[data.length - 1].pnl - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight
      } : { x: 0, y: chartHeight };

      const firstPoint = data.length > 0 ? {
        x: chartPadding,
        y: chartPadding + chartInnerHeight - ((data[0].pnl - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight
      } : { x: 0, y: chartHeight };

      // Create area by going to bottom corners
      const areaPath = curvePath + 
        ` L ${lastPoint.x} ${chartHeight - chartPadding}` +
        ` L ${firstPoint.x} ${chartHeight - chartPadding} Z`;

      return areaPath;
    };

    const isPositive = data.length > 0 ? data[data.length - 1].pnl >= 0 : true;
    const primaryColor = isPositive ? '#10b981' : '#ef4444';
    const gradientId = `gradient-${isPositive ? 'positive' : 'negative'}`;

    return (
      <div className="h-64 w-full relative overflow-hidden" ref={chartRef}>
        {/* Header with current value */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <div className={cn(
                "text-2xl font-bold",
                primaryColor === '#10b981' ? "text-green-500" : "text-red-500"
              )}>
                ${hoveredPoint !== null ? data[hoveredPoint]?.pnl.toFixed(2) : data[data.length - 1]?.pnl.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">
                {hoveredPoint !== null ? `Trade #${data[hoveredPoint]?.tradeNumber}` : 'Current Total'}
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-sm font-medium",
                primaryColor === '#10b981' ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? '+' : ''}{((data[data.length - 1]?.pnl || 0) / Math.abs(data[0]?.pnl || 1) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {data.length} trade{data.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 100 ${chartHeight}`} 
          className="absolute inset-0"
          preserveAspectRatio="none"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor={primaryColor} stopOpacity="0.1" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.05" />
            </linearGradient>
            
            {/* Subtle grid pattern */}
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path 
                d="M 8 0 L 0 0 0 8" 
                fill="none" 
                stroke={theme === 'dark' ? '#374151' : '#f1f5f9'} 
                strokeWidth="0.3" 
                opacity="0.4"
              />
            </pattern>

            {/* Glow effect */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

          {/* Zero line */}
          {minPnL < 0 && maxPnL > 0 && (
            <line
              x1={chartPadding}
              y1={chartPadding + chartInnerHeight - ((0 - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight}
              x2={100 - chartPadding}
              y2={chartPadding + chartInnerHeight - ((0 - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight}
              stroke={theme === 'dark' ? '#4b5563' : '#d1d5db'}
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}

          {/* Area fill */}
          <motion.path
            d={generateAreaPath()}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Main curve line */}
          <motion.path
            d={generateSmoothPath()}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          {/* Interactive data points */}
          {data.map((point, index) => {
            const x = chartPadding + (index / Math.max(data.length - 1, 1)) * (100 - chartPadding * 2);
            const y = chartPadding + chartInnerHeight - ((point.pnl - minPnL + padding) / (range + 2 * padding)) * chartInnerHeight;
            const isHovered = hoveredPoint === index;
            
            return (
              <motion.g key={index}>
                {/* Invisible larger circle for easier hovering */}
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Visible dot */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isHovered ? "3" : "2"}
                  fill={primaryColor}
                  stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                  strokeWidth={isHovered ? "2" : "1.5"}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  className="transition-all duration-200"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : 'none'
                  }}
                />

                {/* Tooltip for hovered point */}
                {isHovered && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <rect
                      x={x - 25}
                      y={y - 35}
                      width="50"
                      height="20"
                      rx="4"
                      fill={theme === 'dark' ? '#374151' : '#ffffff'}
                      stroke={theme === 'dark' ? '#4b5563' : '#e5e7eb'}
                      strokeWidth="1"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                    />
                    <text
                      x={x}
                      y={y - 22}
                      textAnchor="middle"
                      fontSize="8"
                      fill={theme === 'dark' ? '#ffffff' : '#000000'}
                      fontWeight="600"
                    >
                      ${point.tradePnL > 0 ? '+' : ''}${point.tradePnL.toFixed(0)}
                    </text>
                  </motion.g>
                )}
              </motion.g>
            );
          })}
        </svg>

        {/* Performance indicators */}
        <div className="absolute bottom-2 left-4 right-4 flex justify-between items-end text-xs text-muted-foreground">
          <div>
            <div className="font-medium">
              Best: <span className="text-green-500">+${Math.max(...data.map(d => d.tradePnL)).toFixed(0)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">
              Worst: <span className="text-red-500">${Math.min(...data.map(d => d.tradePnL)).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Stats Panel with AI insights and Most Traded toggle
  const EnhancedStatsPanel: React.FC = () => {
    const mostTradedData = getMostTradedAssets();
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return (
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {analyticsView === 'ai' ? (
                      <>
                        <Brain className="h-5 w-5 text-blue-500" />
                        AI Analytics
                      </>
                    ) : (
                      <>
                        <PieChart className="h-5 w-5 text-orange-500" />
                        Most Traded
                      </>
                    )}
                  </CardTitle>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    <Button
                      variant={analyticsView === 'ai' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAnalyticsView('ai')}
                      className="h-7 px-2 text-xs"
                    >
                      AI
                    </Button>
                    <Button
                      variant={analyticsView === 'most-traded' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAnalyticsView('most-traded')}
                      className="h-7 px-2 text-xs"
                    >
                      Assets
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {analyticsView === 'ai' ? (
                  <div className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <motion.div 
                        className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-green-500/20 border border-green-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <p className="font-medium text-green-600">Best Strategy</p>
                        </div>
                        <p className="text-muted-foreground">Breakout trades show 80% win rate during London session</p>
                      </motion.div>
                      
                      <motion.div 
                        className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/20 border border-blue-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <p className="font-medium text-blue-600">Timing Insight</p>
                        </div>
                        <p className="text-muted-foreground">Your performance peaks during European overlap hours</p>
                      </motion.div>
                      
                      <motion.div 
                        className="p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-500/20 border border-orange-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="h-4 w-4 text-orange-500" />
                          <p className="font-medium text-orange-600">Psychology Tip</p>
                        </div>
                        <p className="text-muted-foreground">Confident entries yield 23% higher profits than anxious ones</p>
                      </motion.div>
                      
                      <motion.div 
                        className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/20 border border-purple-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <p className="font-medium text-purple-600">Risk Management</p>
                        </div>
                        <p className="text-muted-foreground">Consider 0.5% position sizing for setups below 2:1 R/R</p>
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Donut Chart */}
                    <div className="relative h-40 flex items-center justify-center">
                      <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="35"
                          fill="none"
                          stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                          strokeWidth="20"
                        />
                        {mostTradedData.map((item, index) => {
                          const total = mostTradedData.reduce((sum, d) => sum + d.count, 0);
                          const percentage = (item.count / total) * 100;
                          const circumference = 2 * Math.PI * 35;
                          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -mostTradedData.slice(0, index).reduce((sum, d) => {
                            return sum + ((d.count / total) * circumference);
                          }, 0);
                          
                          return (
                            <motion.circle
                              key={item.asset}
                              cx="60"
                              cy="60"
                              r="35"
                              fill="none"
                              stroke={colors[index]}
                              strokeWidth="20"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              initial={{ strokeDasharray: `0 ${circumference}` }}
                              animate={{ strokeDasharray, strokeDashoffset }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">{trades.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="space-y-2">
                      {mostTradedData.map((item, index) => {
                        const total = mostTradedData.reduce((sum, d) => sum + d.count, 0);
                        const percentage = ((item.count / total) * 100).toFixed(1);
                        
                        return (
                          <motion.div
                            key={item.asset}
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[index] }}
                              />
                              <span className="text-sm font-medium">{item.asset}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{item.count}</p>
                              <p className="text-xs text-muted-foreground">{percentage}%</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Enhanced Day View with zoom transition
  const EnhancedDayView: React.FC<{ date: string }> = ({ date }) => {
    const dayTrades = trades.filter(t => t.date === date);
    
    return (
      <motion.div
        ref={dayViewRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setJournalState(prev => ({ ...prev, selectedDate: null, isDayViewActive: false }))}
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
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={cn(
                "border-2 transition-all duration-300 hover:shadow-lg",
                theme === 'dark' 
                  ? "bg-slate-900/80 border-slate-700 hover:border-slate-600" 
                  : "bg-white border-slate-200 hover:border-slate-300"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
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
                        {trade.session && (
                          <Badge variant="secondary">
                            {SESSIONS.find(s => s.value === trade.session)?.label.split(' ')[0] || trade.session}
                          </Badge>
                        )}
                      </div>
                      
                      {trade.notes && (
                        <p className="text-sm text-muted-foreground italic">{trade.notes}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {trade.strategy && (
                          <div>
                            <span className="font-medium">Strategy:</span> {trade.strategy}
                          </div>
                        )}
                        {trade.emotion && (
                          <div>
                            <span className="font-medium">Emotion:</span> {trade.emotion}
                          </div>
                        )}
                        {trade.entry_price && (
                          <div>
                            <span className="font-medium">Entry:</span> {trade.entry_price}
                          </div>
                        )}
                        {trade.exit_price && (
                          <div>
                            <span className="font-medium">Exit:</span> {trade.exit_price}
                          </div>
                        )}
                      </div>
                      
                      {trade.ai_feedback && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-600">AI Analysis</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{trade.ai_feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-6">
                      <p className={cn(
                        "text-3xl font-bold",
                        trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        ${trade.pnl.toFixed(2)}
                      </p>
                      {trade.position_size && (
                        <p className="text-sm text-muted-foreground">
                          Size: {trade.position_size.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Add Trade Modal
  const AddTradeModal: React.FC = () => (
    <Dialog open={showAddTradeModal} onOpenChange={setShowAddTradeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Input
                id="asset"
                placeholder="e.g., EURUSD"
                value={newTrade.asset || ''}
                onChange={(e) => setNewTrade(prev => ({ ...prev, asset: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="pnl">P&L ($)</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={newTrade.pnl || ''}
                onChange={(e) => setNewTrade(prev => ({ ...prev, pnl: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={newTrade.direction === 'long' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewTrade(prev => ({ ...prev, direction: 'long' }))}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant={newTrade.direction === 'short' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewTrade(prev => ({ ...prev, direction: 'short' }))}
                >
                  Short
                </Button>
              </div>
            </div>
            <div>
              <Label>Outcome</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={newTrade.outcome === 'win' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewTrade(prev => ({ ...prev, outcome: 'win' }))}
                >
                  Win
                </Button>
                <Button
                  type="button"
                  variant={newTrade.outcome === 'loss' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setNewTrade(prev => ({ ...prev, outcome: 'loss' }))}
                >
                  Loss
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">AI Coach Data Points</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select onValueChange={(value) => setNewTrade(prev => ({ ...prev, strategy: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADING_STRATEGIES.map(strategy => (
                      <SelectItem key={strategy} value={strategy}>{strategy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="emotion">Emotion</Label>
                <Select onValueChange={(value) => setNewTrade(prev => ({ ...prev, emotion: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(emotion => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="session">Trading Session</Label>
              <Select onValueChange={(value) => setNewTrade(prev => ({ ...prev, session: value as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {SESSIONS.map(session => (
                    <SelectItem key={session.value} value={session.value}>{session.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="What happened? What did you learn?"
              value={newTrade.notes || ''}
              onChange={(e) => setNewTrade(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddTradeModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveTrade({ ...newTrade, date: journalState.selectedDate || new Date().toISOString().split('T')[0] })}
              disabled={!newTrade.asset || newTrade.pnl === undefined}
            >
              <Zap className="h-4 w-4 mr-2" />
              Save Trade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Main Dashboard View
  const DashboardView: React.FC = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Journal</h1>
          <p className="text-muted-foreground">Your intelligent trading companion</p>
        </div>
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

      {/* Enhanced Dashboard Metrics */}
      <EnhancedDashboardMetrics metrics={metrics} />

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
                Equity Curve ({journalState.currentFilter.charAt(0).toUpperCase() + journalState.currentFilter.slice(1)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquityCurveChart data={getEquityCurveData()} />
            </CardContent>
          </Card>

          {/* Time Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['today', 'week', 'month', 'year', 'all'] as ViewType[]).map(view => (
                <Button
                  key={view}
                  variant={journalState.currentFilter === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateView(view)}
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
                onClick={() => updateView(undefined, new Date(journalState.currentDate.getFullYear(), journalState.currentDate.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {journalState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateView(undefined, new Date(journalState.currentDate.getFullYear(), journalState.currentDate.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dynamic Calendar */}
          <Card className={cn(
            theme === 'dark' 
              ? "bg-slate-900/80 border-slate-700" 
              : "bg-white border-slate-200"
          )}>
            <CardContent className="p-6">
              <DynamicCalendarView />
            </CardContent>
          </Card>

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
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                        {trade.asset}
                      </Badge>
                      <span className="text-sm">{trade.direction.toUpperCase()}</span>
                      {trade.strategy && (
                        <span className="text-xs text-muted-foreground">{trade.strategy}</span>
                      )}
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

        {/* Right Side - Enhanced Stats Panel */}
        <EnhancedStatsPanel />
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
        {journalState.selectedDate ? (
          <EnhancedDayView key="day-view" date={journalState.selectedDate} />
        ) : (
          <DashboardView key="dashboard-view" />
        )}
      </AnimatePresence>
      
      <AddTradeModal />
    </div>
  );
};