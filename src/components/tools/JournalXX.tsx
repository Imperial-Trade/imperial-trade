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

export const JournalXX: React.FC = () => {
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

      // Get AI analysis for the trade
      const aiAnalysis = await getAISummaryForTrade(tradeData);
      
      // Update with AI feedback
      if (data && aiAnalysis !== 'AI analysis temporarily unavailable.') {
        await supabase
          .from('trade_journal_entries')
          .update({ ai_positive_feedback: aiAnalysis })
          .eq('id', data.id);
      }

      toast({
        title: "Trade Added",
        description: "Trade successfully saved with AI analysis",
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

  // Enhanced Dashboard Metrics Component
  const EnhancedDashboardMetrics: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    >
      {[
        { 
          label: 'Total P&L', 
          value: `$${metrics.totalPnL.toFixed(2)}`, 
          icon: DollarSign, 
          color: metrics.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500',
          bg: metrics.totalPnL >= 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'
        },
        { 
          label: 'Win Rate', 
          value: `${metrics.winRate.toFixed(1)}%`, 
          icon: Target, 
          color: metrics.winRate >= 50 ? 'text-emerald-500' : 'text-red-500',
          bg: metrics.winRate >= 50 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'
        },
        { 
          label: 'Profit Factor', 
          value: metrics.profitFactor.toFixed(2), 
          icon: BarChart3, 
          color: metrics.profitFactor >= 1 ? 'text-emerald-500' : 'text-red-500',
          bg: metrics.profitFactor >= 1 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'
        },
        { 
          label: 'Total Trades', 
          value: metrics.totalTrades, 
          icon: Activity, 
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950'
        }
      ].map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={cn("transition-all duration-300 hover:shadow-lg", metric.bg)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className={cn("text-2xl font-bold", metric.color)}>{metric.value}</p>
                </div>
                <metric.icon className={cn("h-8 w-8", metric.color)} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  // Dynamic Calendar View Component with Enhanced Animations
  const DynamicCalendarView: React.FC = () => {
    const generateCalendar = () => {
      const year = journalState.currentDate.getFullYear();
      const month = journalState.currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startingDayOfWeek = firstDay.getDay();
      const daysInMonth = lastDay.getDate();
      
      const days = [];
      
      // Empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }
      
      return days;
    };

    const getDayTrades = (day: number) => {
      const dateStr = `${journalState.currentDate.getFullYear()}-${String(journalState.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return filteredTrades.filter(trade => trade.date === dateStr);
    };

    const getDayPnL = (dayTrades: Trade[]) => {
      return dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg p-6 shadow-sm border"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">
              {monthNames[journalState.currentDate.getMonth()]} {journalState.currentDate.getFullYear()}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(journalState.currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  updateView(undefined, newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(journalState.currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  updateView(undefined, newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            {['today', 'week', 'month', 'year', 'all'].map((filter) => (
              <Button
                key={filter}
                variant={journalState.currentFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateView(filter as ViewType)}
                className="capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {generateCalendar().map((day, index) => {
            if (day === null) {
              return <div key={index} className="p-2 h-20"></div>;
            }

            const dayTrades = getDayTrades(day);
            const dayPnL = getDayPnL(dayTrades);
            const hasActivity = dayTrades.length > 0;
            const dateStr = `${journalState.currentDate.getFullYear()}-${String(journalState.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={cn(
                  "p-2 h-20 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                  hasActivity 
                    ? dayPnL >= 0 
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900" 
                      : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900"
                    : "bg-muted/30 hover:bg-muted/50",
                  journalState.selectedDate === dateStr && "ring-2 ring-primary"
                )}
                onClick={(e) => hasActivity && handleDateClick(dateStr, e)}
              >
                <div className="text-sm font-medium">{day}</div>
                {hasActivity && (
                  <div className="mt-1">
                    <div className={cn(
                      "text-xs font-medium",
                      dayPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                      ${dayPnL.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Equity Curve Chart Component
  const EquityCurveChart: React.FC<{ data: Array<{date: string, pnl: number, tradePnL: number, tradeNumber: number}> }> = ({ data }) => {
    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No trade data available for equity curve
        </div>
      );
    }

    const maxPnL = Math.max(...data.map(d => d.pnl));
    const minPnL = Math.min(...data.map(d => d.pnl));
    const range = maxPnL - minPnL || 1;

    return (
      <div className="h-64 relative bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg p-4">
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="40"
              y1={40 + (200 - 40) * ratio}
              x2="90%"
              y2={40 + (200 - 40) * ratio}
              stroke="hsl(var(--border))"
              strokeOpacity="0.3"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Equity curve */}
          <path
            d={`M 40 ${240 - ((data[0].pnl - minPnL) / range) * 200} ${data.map((point, index) => {
              const x = 40 + (index / (data.length - 1)) * (window.innerWidth * 0.8 - 80);
              const y = 240 - ((point.pnl - minPnL) / range) * 200;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Fill area */}
          <path
            d={`M 40 240 L 40 ${240 - ((data[0].pnl - minPnL) / range) * 200} ${data.map((point, index) => {
              const x = 40 + (index / (data.length - 1)) * (window.innerWidth * 0.8 - 80);
              const y = 240 - ((point.pnl - minPnL) / range) * 200;
              return `L ${x} ${y}`;
            }).join(' ')} L ${40 + ((data.length - 1) / (data.length - 1)) * (window.innerWidth * 0.8 - 80)} 240 Z`}
            fill="url(#equityGradient)"
          />
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4 text-xs text-muted-foreground">
          <span>${maxPnL.toFixed(0)}</span>
          <span>${((maxPnL + minPnL) / 2).toFixed(0)}</span>
          <span>${minPnL.toFixed(0)}</span>
        </div>
      </div>
    );
  };

  // Enhanced Stats Panel
  const EnhancedStatsPanel: React.FC = () => {
    const getAIInsights = () => {
      if (filteredTrades.length === 0) return "No trades to analyze yet. Start logging your trades to get AI insights!";
      
      const insights = [];
      
      if (metrics.winRate > 60) {
        insights.push("🎯 Excellent win rate! You're showing strong trade selection skills.");
      } else if (metrics.winRate < 40) {
        insights.push("⚠️ Consider reviewing your entry criteria - win rate could be improved.");
      }
      
      if (metrics.profitFactor > 1.5) {
        insights.push("💰 Strong profit factor indicates good risk management.");
      } else if (metrics.profitFactor < 1) {
        insights.push("📊 Focus on improving your profit factor through better exits or position sizing.");
      }
      
      const recentTrades = filteredTrades.slice(0, 5);
      const recentWins = recentTrades.filter(t => t.outcome === 'win').length;
      
      if (recentWins === recentTrades.length && recentTrades.length >= 3) {
        insights.push("🔥 You're on a winning streak! Stay disciplined and stick to your strategy.");
      } else if (recentWins === 0 && recentTrades.length >= 3) {
        insights.push("💡 Consider taking a break to review your strategy and market conditions.");
      }
      
      return insights.length > 0 ? insights.join(' ') : "Keep tracking your trades for more personalized insights!";
    };

    const getMostTradedAssets = () => {
      const assetCounts = filteredTrades.reduce((acc, trade) => {
        acc[trade.asset] = (acc[trade.asset] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(assetCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    };

    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{getAIInsights()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Most Traded Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getMostTradedAssets().map(([asset, count], index) => (
                <div key={asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      index === 0 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                      index === 1 ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" :
                      index === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{asset}</span>
                  </div>
                  <Badge variant="secondary">{count} trades</Badge>
                </div>
              ))}
              {getMostTradedAssets().length === 0 && (
                <p className="text-muted-foreground text-sm">No trades logged yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Win</span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ${metrics.avgWin.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Loss</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  ${metrics.avgLoss.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Best Trade</span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ${metrics.bestTrade.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Worst Trade</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  ${metrics.worstTrade.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Enhanced Day View Component
  const EnhancedDayView: React.FC<{ date: string }> = ({ date }) => {
    const dayTrades = filteredTrades.filter(trade => trade.date === date);
    const dayPnL = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const dayMetrics = calculateMetrics(dayTrades);

    return (
      <motion.div
        ref={dayViewRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setJournalState(prev => ({ ...prev, selectedDate: null, isDayViewActive: false }))}
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="bg-card rounded-lg shadow-xl border max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={dayPnL >= 0 ? 'default' : 'destructive'} className="text-sm">
                    P&L: ${dayPnL.toFixed(2)}
                  </Badge>
                  <Badge variant="outline">{dayTrades.length} trades</Badge>
                  <Badge variant="outline">Win Rate: {dayMetrics.winRate.toFixed(1)}%</Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJournalState(prev => ({ ...prev, selectedDate: null, isDayViewActive: false }))}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          <ScrollArea className="p-6 max-h-[60vh]">
            <div className="space-y-4">
              {dayTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    trade.outcome === 'win' 
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/50" 
                      : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                            {trade.asset} {trade.direction.toUpperCase()}
                          </Badge>
                          <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                            {trade.outcome.toUpperCase()}
                          </Badge>
                        </div>
                        <div className={cn(
                          "text-lg font-bold",
                          trade.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                          ${trade.pnl.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        {trade.entry_price && (
                          <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-1 font-medium">{trade.entry_price}</span>
                          </div>
                        )}
                        {trade.exit_price && (
                          <div>
                            <span className="text-muted-foreground">Exit:</span>
                            <span className="ml-1 font-medium">{trade.exit_price}</span>
                          </div>
                        )}
                        {trade.position_size && (
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <span className="ml-1 font-medium">{trade.position_size}</span>
                          </div>
                        )}
                        {trade.strategy && (
                          <div>
                            <span className="text-muted-foreground">Strategy:</span>
                            <span className="ml-1 font-medium">{trade.strategy}</span>
                          </div>
                        )}
                      </div>
                      
                      {trade.notes && (
                        <div className="mb-3">
                          <Label className="text-muted-foreground text-xs">Notes:</Label>
                          <p className="text-sm mt-1">{trade.notes}</p>
                        </div>
                      )}
                      
                      {trade.ai_feedback && (
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                          <Label className="text-primary text-xs flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            AI Analysis:
                          </Label>
                          <p className="text-sm mt-1 text-primary/80">{trade.ai_feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              
              {dayTrades.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trades recorded for this day</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    );
  };

  // Add Trade Modal
  const AddTradeModal: React.FC = () => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTrade.asset || !newTrade.direction || !newTrade.pnl || !newTrade.date) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
      
      const tradeToSave = {
        ...newTrade,
        outcome: (newTrade.pnl || 0) >= 0 ? 'win' as const : 'loss' as const
      };
      
      saveTrade(tradeToSave);
    };

    return (
      <Dialog open={showAddTradeModal} onOpenChange={setShowAddTradeModal}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Add New Trade
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset *</Label>
                <Input
                  id="asset"
                  placeholder="e.g., EURUSD, AAPL, BTC"
                  value={newTrade.asset || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, asset: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="direction">Direction *</Label>
                <Select
                  value={newTrade.direction || ''}
                  onValueChange={(value) => setNewTrade(prev => ({ ...prev, direction: value as 'long' | 'short' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pnl">P&L ($) *</Label>
                <Input
                  id="pnl"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 150.00 or -75.50"
                  value={newTrade.pnl || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, pnl: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newTrade.date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="entry_price">Entry Price</Label>
                <Input
                  id="entry_price"
                  type="number"
                  step="0.00001"
                  placeholder="e.g., 1.08500"
                  value={newTrade.entry_price || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, entry_price: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="0.00001"
                  placeholder="e.g., 1.08750"
                  value={newTrade.exit_price || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, exit_price: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position_size">Position Size</Label>
                <Input
                  id="position_size"
                  type="number"
                  placeholder="e.g., 1000"
                  value={newTrade.position_size || ''}
                  onChange={(e) => setNewTrade(prev => ({ ...prev, position_size: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="strategy">Strategy</Label>
                <Select
                  value={newTrade.strategy || ''}
                  onValueChange={(value) => setNewTrade(prev => ({ ...prev, strategy: value }))}
                >
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
              
              <div className="space-y-2">
                <Label htmlFor="emotion">Emotion</Label>
                <Select
                  value={newTrade.emotion || ''}
                  onValueChange={(value) => setNewTrade(prev => ({ ...prev, emotion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did you feel?" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(emotion => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session">Trading Session</Label>
                <Select
                  value={newTrade.session || ''}
                  onValueChange={(value) => setNewTrade(prev => ({ ...prev, session: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSIONS.map(session => (
                      <SelectItem key={session.value} value={session.value}>
                        {session.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add your trade notes, observations, or lessons learned..."
                rows={3}
                value={newTrade.notes || ''}
                onChange={(e) => setNewTrade(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTradeModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Trade
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Dashboard View Component
  const DashboardView: React.FC = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground mt-1">
            Track your trades, analyze performance, and improve your strategy
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="ml-2">{showStats ? 'Hide' : 'Show'} Stats</span>
          </Button>
          <AddTradeModal />
        </div>
      </div>

      <EnhancedDashboardMetrics metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DynamicCalendarView />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquityCurveChart data={getEquityCurveData()} />
            </CardContent>
          </Card>
        </div>
        
        {showStats && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <EnhancedStatsPanel />
          </motion.div>
        )}
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6">
        <AnimatePresence mode="wait">
          {journalState.isDayViewActive && journalState.selectedDate ? (
            <EnhancedDayView key="day-view" date={journalState.selectedDate} />
          ) : (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};