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

// Sample data for demo
const sampleTrades: Trade[] = [
  {
    id: '1',
    user_id: 'demo-user',
    date: '2024-07-01',
    asset: 'XAUUSD-STD',
    direction: 'long',
    outcome: 'win',
    pnl: 500,
    entry_price: 2340.50,
    exit_price: 2350.75,
    position_size: 1000,
    strategy: 'Breakout',
    emotion: 'Confident',
    session: 'london',
    notes: 'Gold breakout above key resistance. Strong momentum.',
    ai_feedback: 'Excellent trade execution. Your confidence in breakout setups during London session shows strong pattern recognition.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'demo-user',
    date: '2024-07-02',
    asset: 'BTCUSD',
    direction: 'short',
    outcome: 'loss',
    pnl: -150,
    entry_price: 65000,
    exit_price: 64850,
    position_size: 500,
    strategy: 'Reversal',
    emotion: 'Anxious',
    session: 'newyork',
    notes: 'Bitcoin reversal signal failed. Market continued upward.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    user_id: 'demo-user',
    date: '2024-07-03',
    asset: 'NAS100fil.s',
    direction: 'long',
    outcome: 'loss',
    pnl: -100,
    entry_price: 19500,
    exit_price: 19400,
    position_size: 100,
    strategy: 'Trend Following',
    emotion: 'Neutral',
    session: 'london',
    notes: 'Nasdaq pullback entry, stopped out before continuation.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    user_id: 'demo-user',
    date: '2024-07-04',
    asset: 'XAUUSD-STD',
    direction: 'long',
    outcome: 'win',
    pnl: 450,
    entry_price: 2345.20,
    exit_price: 2355.45,
    position_size: 1200,
    strategy: 'Support/Resistance',
    emotion: 'Confident',
    session: 'london',
    notes: 'Perfect bounce from support level. Textbook trade.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    user_id: 'demo-user',
    date: '2024-07-05',
    asset: 'NAS100.s',
    direction: 'short',
    outcome: 'loss',
    pnl: -75,
    entry_price: 19600,
    exit_price: 19675,
    position_size: 50,
    strategy: 'Reversal',
    emotion: 'Greedy',
    session: 'newyork',
    notes: 'Premature short entry. Should have waited for confirmation.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    user_id: 'demo-user',
    date: '2024-07-06',
    asset: 'BTCUSD',
    direction: 'long',
    outcome: 'loss',
    pnl: -25,
    entry_price: 65200,
    exit_price: 65175,
    position_size: 200,
    strategy: 'Scalping',
    emotion: 'Focused',
    session: 'tokyo',
    notes: 'Quick scalp attempt, minimal loss on tight stop.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '7',
    user_id: 'demo-user',
    date: '2024-07-07',
    asset: 'XAUUSD-STD',
    direction: 'long',
    outcome: 'win',
    pnl: 175,
    entry_price: 2350.00,
    exit_price: 2356.50,
    position_size: 800,
    strategy: 'Breakout',
    emotion: 'Confident',
    session: 'london',
    notes: 'Another successful gold breakout. Pattern working well.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '8',
    user_id: 'demo-user',
    date: '2024-07-08',
    asset: 'NAS100fil.s',
    direction: 'long',
    outcome: 'win',
    pnl: 250,
    entry_price: 19450,
    exit_price: 19575,
    position_size: 150,
    strategy: 'Trend Following',
    emotion: 'Disciplined',
    session: 'newyork',
    notes: 'Patient entry on pullback. Trend continuation worked perfectly.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '9',
    user_id: 'demo-user',
    date: '2024-07-09',
    asset: 'XAUUSD-STD',
    direction: 'long',
    outcome: 'win',
    pnl: 550,
    entry_price: 2358.25,
    exit_price: 2370.75,
    position_size: 1500,
    strategy: 'News Trading',
    emotion: 'Excited',
    session: 'london',
    notes: 'Fed news spike. Perfect timing on the breakout.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10',
    user_id: 'demo-user',
    date: '2024-07-10',
    asset: 'BTCUSD',
    direction: 'long',
    outcome: 'win',
    pnl: 400,
    entry_price: 65100,
    exit_price: 65500,
    position_size: 800,
    strategy: 'Support/Resistance',
    emotion: 'Confident',
    session: 'newyork',
    notes: 'Bitcoin found support at key level. Clean bounce.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '11',
    user_id: 'demo-user',
    date: '2024-07-11',
    asset: 'NAS100.s',
    direction: 'short',
    outcome: 'win',
    pnl: 375,
    entry_price: 19650,
    exit_price: 19525,
    position_size: 200,
    strategy: 'Reversal',
    emotion: 'Focused',
    session: 'newyork',
    notes: 'Perfect reversal setup. Resistance held strong.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '12',
    user_id: 'demo-user',
    date: '2024-07-12',
    asset: 'XAUUSD-STD',
    direction: 'short',
    outcome: 'loss',
    pnl: -150,
    entry_price: 2370.50,
    exit_price: 2380.00,
    position_size: 600,
    strategy: 'Reversal',
    emotion: 'Impulsive',
    session: 'london',
    notes: 'Premature reversal call. Gold continued higher.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '13',
    user_id: 'demo-user',
    date: '2024-07-13',
    asset: 'NAS100fil.s',
    direction: 'long',
    outcome: 'loss',
    pnl: -90,
    entry_price: 19600,
    exit_price: 19540,
    position_size: 120,
    strategy: 'Breakout',
    emotion: 'Frustrated',
    session: 'newyork',
    notes: 'False breakout. Should have waited for retest.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '14',
    user_id: 'demo-user',
    date: '2024-07-14',
    asset: 'BTCUSD',
    direction: 'long',
    outcome: 'win',
    pnl: 275,
    entry_price: 65300,
    exit_price: 65575,
    position_size: 600,
    strategy: 'Trend Following',
    emotion: 'Disciplined',
    session: 'tokyo',
    notes: 'Good trend entry. Followed the plan perfectly.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '15',
    user_id: 'demo-user',
    date: '2024-07-15',
    asset: 'XAUUSD-STD',
    direction: 'long',
    outcome: 'win',
    pnl: 325,
    entry_price: 2375.00,
    exit_price: 2383.25,
    position_size: 1000,
    strategy: 'Support/Resistance',
    emotion: 'Confident',
    session: 'london',
    notes: 'Strong support bounce. Excellent risk/reward.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '16',
    user_id: 'demo-user',
    date: '2024-07-16',
    asset: 'NAS100.s',
    direction: 'short',
    outcome: 'loss',
    pnl: -600,
    entry_price: 19700,
    exit_price: 19760,
    position_size: 400,
    strategy: 'Reversal',
    emotion: 'Fearful',
    session: 'newyork',
    notes: 'Biggest loss of the month. Should have cut earlier.',
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

  const metrics = calculateMetrics(trades);

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

  // Equity Curve Component
  const EquityCurve: React.FC = () => {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const equityData = [];
    let runningBalance = 500; // Starting balance

    equityData.push({ date: '07/01', value: runningBalance });
    
    sortedTrades.forEach((trade) => {
      runningBalance += trade.pnl;
      const date = new Date(trade.date);
      const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      equityData.push({ date: formattedDate, value: Math.max(0, runningBalance) });
    });

    const maxValue = Math.max(...equityData.map(d => d.value));
    const minValue = Math.min(...equityData.map(d => d.value));
    const range = maxValue - minValue;
    const padding = range * 0.1;

    const chartHeight = 200;
    const chartWidth = 480;
    const chartPadding = { top: 20, right: 20, bottom: 40, left: 60 };

    const getX = (index: number) => (index / (equityData.length - 1)) * (chartWidth - chartPadding.left - chartPadding.right) + chartPadding.left;
    const getY = (value: number) => chartHeight - chartPadding.bottom - ((value - (minValue - padding)) / (range + 2 * padding)) * (chartHeight - chartPadding.top - chartPadding.bottom);

    const pathData = equityData.map((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    const areaPath = `${pathData} L ${getX(equityData.length - 1)} ${chartHeight - chartPadding.bottom} L ${getX(0)} ${chartHeight - chartPadding.bottom} Z`;

    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 6; i++) {
      const value = minValue + (range * i / 6);
      const y = getY(value);
      gridLines.push(
        <line
          key={i}
          x1={chartPadding.left}
          y1={y}
          x2={chartWidth - chartPadding.right}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      );
    }

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance</h3>
          <Button variant="outline" size="sm" className="text-xs">
            Rebate
          </Button>
        </div>
        <div className="relative">
          <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
            {/* Grid lines */}
            {gridLines}
            
            {/* Area fill */}
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <path
              d={areaPath}
              fill="url(#areaGradient)"
            />
            
            {/* Main line */}
            <path
              d={pathData}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
            
            {/* Data points */}
            {equityData.map((point, index) => (
              <circle
                key={index}
                cx={getX(index)}
                cy={getY(point.value)}
                r={3}
                fill="hsl(var(--primary))"
                stroke="white"
                strokeWidth={2}
              />
            ))}
            
            {/* Y-axis labels */}
            {[0, 100, 200, 300, 400, 500, 600].map((value) => (
              <text
                key={value}
                x={chartPadding.left - 10}
                y={getY(value) + 4}
                textAnchor="end"
                fontSize="12"
                fill="currentColor"
                opacity={0.6}
              >
                {value}
              </text>
            ))}
            
            {/* X-axis labels */}
            {equityData.filter((_, i) => i % 2 === 0).map((point, index) => {
              const actualIndex = index * 2;
              return (
                <text
                  key={actualIndex}
                  x={getX(actualIndex)}
                  y={chartHeight - chartPadding.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                  opacity={0.6}
                >
                  {point.date}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Most Traded Instruments Data
  const getMostTradedData = () => {
    const assetCounts = trades.reduce((acc, trade) => {
      acc[trade.asset] = (acc[trade.asset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedAssets = Object.entries(assetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4);

    const total = sortedAssets.reduce((sum, [,count]) => sum + count, 0);
    
    return sortedAssets.map(([asset, count], index) => ({
      name: asset,
      value: count,
      percentage: ((count / total) * 100).toFixed(1),
      color: [`hsl(var(--primary))`, `hsl(var(--primary) / 0.8)`, `hsl(var(--primary) / 0.6)`, `hsl(var(--primary) / 0.4)`][index]
    }));
  };

  // Donut Chart Component
  const DonutChart: React.FC<{ data: Array<{name: string, value: number, percentage: string, color: string}> }> = ({ data }) => {
    const size = 160;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    let cumulativePercentage = 0;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = parseFloat(item.percentage);
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercentage * circumference / 100;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={item.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>
        <div className="mt-4 space-y-2 w-full">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-muted-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced Stats Panel with toggle between AI Analytics and Most Traded
  const [statsView, setStatsView] = useState<'ai' | 'traded'>('ai');
  
  const EnhancedStatsPanel: React.FC = () => (
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
                  {statsView === 'ai' ? (
                    <>
                      <Brain className="h-5 w-5 text-blue-500" />
                      AI Analytics
                    </>
                  ) : (
                    <>
                      <PieChart className="h-5 w-5 text-blue-500" />
                      Most traded instruments
                    </>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={statsView === 'ai' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatsView('ai')}
                    className="text-xs"
                  >
                    AI Analytics
                  </Button>
                  <Button
                    variant={statsView === 'traded' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatsView('traded')}
                    className="text-xs"
                  >
                    Most Traded
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statsView === 'ai' ? (
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
                  <div className="flex justify-center">
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button variant="default" size="sm" className="text-xs">
                        Standard Lots
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Micro Lots
                      </Button>
                    </div>
                  </div>
                  <DonutChart data={getMostTradedData()} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

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
            <CardContent className="p-6">
              <EquityCurve />
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