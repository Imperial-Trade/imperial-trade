
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

// Sample data for demo
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

  const filteredTrades = trades;
  const metrics = calculateMetrics(filteredTrades);

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

      {/* Main Content */}
      <div className="grid gap-6">
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
              Trading Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Performance analytics coming soon</p>
                <p className="text-sm">Start trading to see your progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade Log */}
        <Card className={cn(
          theme === 'dark' 
            ? "bg-slate-900/80 border-slate-700" 
            : "bg-white border-slate-200"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Trades</CardTitle>
              <Button
                onClick={() => setShowAddTradeModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Trade
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trades.slice(0, 5).map(trade => (
                <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.outcome === 'win' ? 'default' : 'destructive'}>
                      {trade.asset}
                    </Badge>
                    <span className="text-sm font-medium">{trade.direction.toUpperCase()}</span>
                    {trade.strategy && (
                      <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                        {trade.strategy}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "font-bold text-lg",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      ${trade.pnl.toFixed(2)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trade.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddTradeModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Saving trade:', newTrade);
                setShowAddTradeModal(false);
                setNewTrade({});
                toast({
                  title: "Trade Saved",
                  description: "Your trade has been logged successfully",
                });
              }}
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

  return (
    <div className={cn(
      "min-h-screen p-6 transition-colors duration-300",
      theme === 'dark' 
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" 
        : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
    )}>
      <DashboardView />
      <AddTradeModal />
    </div>
  );
};

export default TradingJournalApp;
