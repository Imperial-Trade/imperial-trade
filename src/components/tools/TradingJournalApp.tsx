import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
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
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddTradeModal from "@/components/trading/AddTradeModal";
import { TradeFormData } from "@/hooks/useTradeForm";

// Enhanced Types
interface Trade {
  id: string;
  user_id: string;
  date: string;
  asset: string;
  direction: "long" | "short";
  outcome: "win" | "loss";
  pnl: number;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  strategy?: string;
  emotion?: string;
  session?: "sydney" | "tokyo" | "london" | "newyork";
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

type ViewType = "today" | "week" | "month" | "year" | "all";

interface JournalState {
  currentDate: Date;
  currentFilter: ViewType;
  journalEntries: Map<string, Trade[]>;
  selectedDate: string | null;
  isLoading: boolean;
  isDayViewActive: boolean;
}

// Move SESSIONS constant to global scope
const SESSIONS = [
  { value: "sydney", label: "Sydney (9PM-6AM GMT)" },
  { value: "tokyo", label: "Tokyo (11PM-8AM GMT)" },
  { value: "london", label: "London (7AM-4PM GMT)" },
  { value: "newyork", label: "New York (12PM-9PM GMT)" },
] as const;

// Sample data for demo with multiple trades across different time periods
const sampleTrades: Trade[] = [
  {
    id: "1",
    user_id: "demo-user",
    date: "2024-01-15",
    asset: "EURUSD",
    direction: "long",
    outcome: "win",
    pnl: 250,
    entry_price: 1.085,
    exit_price: 1.0875,
    position_size: 1000,
    strategy: "Breakout",
    emotion: "Confident",
    session: "london",
    notes: "Clean breakout above resistance level. Textbook setup.",
    ai_feedback:
      "Excellent trade execution. Your confidence in breakout setups during London session shows strong pattern recognition.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "demo-user",
    date: "2024-01-16",
    asset: "GBPUSD",
    direction: "short",
    outcome: "loss",
    pnl: -120,
    entry_price: 1.275,
    exit_price: 1.278,
    position_size: 800,
    strategy: "Reversal",
    emotion: "Frustrated",
    session: "newyork",
    notes: "False breakout. Should have waited for confirmation.",
    ai_feedback:
      "Consider using additional confirmation signals for reversal trades. Your frustration might have led to early exit.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "demo-user",
    date: "2024-01-17",
    asset: "USDJPY",
    direction: "long",
    outcome: "win",
    pnl: 180,
    entry_price: 148.5,
    exit_price: 149.2,
    position_size: 1200,
    strategy: "Trend Following",
    emotion: "Confident",
    session: "tokyo",
    notes: "Perfect trend continuation setup.",
    ai_feedback:
      "Excellent trend following execution. Your confidence in trending markets is a strength.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "demo-user",
    date: "2024-01-18",
    asset: "EURUSD",
    direction: "short",
    outcome: "win",
    pnl: 320,
    entry_price: 1.089,
    exit_price: 1.085,
    position_size: 1500,
    strategy: "Support/Resistance",
    emotion: "Disciplined",
    session: "london",
    notes: "Perfect rejection at resistance level.",
    ai_feedback:
      "Outstanding discipline in waiting for the perfect setup at key resistance.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    user_id: "demo-user",
    date: "2024-01-19",
    asset: "AUDUSD",
    direction: "long",
    outcome: "loss",
    pnl: -95,
    entry_price: 0.675,
    exit_price: 0.673,
    position_size: 900,
    strategy: "News Trading",
    emotion: "Anxious",
    session: "sydney",
    notes: "News went against expectation.",
    ai_feedback:
      "News trading requires quick decision-making. Consider position sizing for volatile events.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "6",
    user_id: "demo-user",
    date: "2024-01-22",
    asset: "GBPJPY",
    direction: "long",
    outcome: "win",
    pnl: 275,
    entry_price: 188.5,
    exit_price: 190.0,
    position_size: 1100,
    strategy: "Breakout",
    emotion: "Focused",
    session: "london",
    notes: "Clean breakout with volume confirmation.",
    ai_feedback:
      "Great use of volume confirmation. Your focus during London session shows consistent performance.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const TradingJournalApp: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();

  // Enhanced state management
  const [journalState, setJournalState] = useState<JournalState>({
    currentDate: new Date(),
    currentFilter: "month",
    journalEntries: new Map(),
    selectedDate: null,
    isLoading: false,
    isDayViewActive: false,
  });

  const [trades, setTrades] = useState<Trade[]>(sampleTrades);
  const [showStats, setShowStats] = useState(true);
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const dayViewRef = useRef<HTMLDivElement>(null);

  // Real-time database sync with Supabase
  const setupJournalListener = useCallback(async () => {
    if (!user) return;

    setJournalState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data: initialTrades, error } = await supabase
        .from("trade_journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false });

      if (error) throw error;

      const mappedTrades: Trade[] =
        initialTrades?.map((trade) => ({
          id: trade.id,
          user_id: trade.user_id,
          date: trade.trade_date,
          asset: trade.asset_ticker,
          direction:
            (trade.trade_type?.toLowerCase() as "long" | "short") || "long",
          outcome: trade.pnl >= 0 ? "win" : "loss",
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
          updated_at: trade.updated_at,
        })) || [];

      setTrades(mappedTrades);

      const channel = supabase
        .channel("trade_journal_updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "trade_journal_entries",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            supabase
              .from("trade_journal_entries")
              .select("*")
              .eq("user_id", user.id)
              .order("trade_date", { ascending: false })
              .then(({ data }) => {
                if (data) {
                  const updatedTrades: Trade[] = data.map((trade) => ({
                    id: trade.id,
                    user_id: trade.user_id,
                    date: trade.trade_date,
                    asset: trade.asset_ticker,
                    direction:
                      (trade.trade_type?.toLowerCase() as "long" | "short") ||
                      "long",
                    outcome: trade.pnl >= 0 ? "win" : "loss",
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
                    updated_at: trade.updated_at,
                  }));
                  setTrades(updatedTrades);
                }
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error("Error setting up journal listener:", error);
      toast({
        title: "Error",
        description: "Failed to sync with database",
        variant: "destructive",
      });
    } finally {
      setJournalState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user, toast]);

  useEffect(() => {
    setupJournalListener();
  }, [setupJournalListener]);

  // Enhanced metrics calculation
  const calculateMetrics = (filteredTrades: Trade[]): DashboardMetrics => {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter((t) => t.outcome === "win");
    const losses = filteredTrades.filter((t) => t.outcome === "loss");
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
      bestTrade: Math.max(...filteredTrades.map((t) => t.pnl), 0),
      worstTrade: Math.min(...filteredTrades.map((t) => t.pnl), 0),
    };
  };

  // Filter trades based on current view
  const getFilteredTrades = useCallback(() => {
    const now = new Date();
    const currentDate = journalState.currentDate;

    switch (journalState.currentFilter) {
      case "today":
        const today = now.toISOString().split("T")[0];
        return trades.filter((t) => t.date === today);

      case "week":
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return trades.filter((t) => {
          const tradeDate = new Date(t.date);
          return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
        });

      case "month":
        return trades.filter((t) => {
          const tradeDate = new Date(t.date);
          return (
            tradeDate.getMonth() === currentDate.getMonth() &&
            tradeDate.getFullYear() === currentDate.getFullYear()
          );
        });

      case "year":
        return trades.filter((t) => {
          const tradeDate = new Date(t.date);
          return tradeDate.getFullYear() === currentDate.getFullYear();
        });

      case "all":
      default:
        return trades;
    }
  }, [trades, journalState.currentFilter, journalState.currentDate]);

  const filteredTrades = getFilteredTrades();
  const metrics = calculateMetrics(filteredTrades);

  // Generate equity curve data
  const getEquityCurveData = useCallback(() => {
    const sortedTrades = filteredTrades.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let cumulativePnL = 0;

    return sortedTrades.map((trade, index) => {
      cumulativePnL += trade.pnl;
      return {
        date: trade.date,
        pnl: cumulativePnL,
        tradePnL: trade.pnl,
        tradeNumber: index + 1,
      };
    });
  }, [filteredTrades]);

  // Centralized state update function (the "brain" of the app)
  const updateView = useCallback((newFilter?: ViewType, newDate?: Date) => {
    setJournalState((prev) => ({
      ...prev,
      currentFilter: newFilter || prev.currentFilter,
      currentDate: newDate || prev.currentDate,
      selectedDate: null,
    }));
  }, []);

  // Handle date click with smooth transition animation
  const handleDateClick = useCallback(
    (dateStr: string, event: React.MouseEvent, openModal?: boolean) => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();

      if (dayViewRef.current) {
        dayViewRef.current.style.transformOrigin = `${
          rect.left + rect.width / 2
        }px ${rect.top + rect.height / 2}px`;
      }

      setJournalState((prev) => ({
        ...prev,
        selectedDate: dateStr,
        isDayViewActive: true,
      }));

      if (openModal) {
        setShowAddTradeModal(true);
      }
    },
    []
  );

  // AI Analysis Function - Fixed type compatibility
  const getAISummaryForTrade = async (tradeData: TradeFormData) => {
    try {
      const prompt = `Analyze this trading data and provide insights:
Asset: ${tradeData.asset}
Direction: ${tradeData.direction}
Outcome: ${tradeData.outcome}
P/L: $${tradeData.pnl}
Strategy: ${tradeData.strategy || "Not specified"}
Emotion: ${tradeData.emotion || "Not specified"}
Session: ${tradeData.session || "Not specified"}
Notes: ${tradeData.notes || "None"}

Please provide a brief analysis focusing on what went well, what could be improved, and any patterns you notice.`;

      const response = await supabase.functions.invoke("ai-trade-analysis", {
        body: { prompt },
      });

      return response.data?.analysis || "Analysis pending...";
    } catch (error) {
      console.error("AI analysis failed:", error);
      return "AI analysis temporarily unavailable.";
    }
  };

  // Optimized save trade handler
  const handleSaveTrade = useCallback(async (tradeData: TradeFormData & { date: string }) => {
    if (!user) return;

    try {
      const tradeEntry = {
        user_id: user.id,
        asset_ticker: tradeData.asset,
        trade_type: (tradeData.direction === "long" ? "Long" : "Short") as
          | "Long"
          | "Short",
        pnl: tradeData.pnl as number,
        trade_date: tradeData.date,
        entry_price: tradeData.entry_price,
        exit_price: tradeData.exit_price,
        position_size: tradeData.position_size,
        notes: tradeData.notes,
        screenshot_url: tradeData.screenshot_url,
      };

      const { data, error } = await supabase
        .from("trade_journal_entries")
        .insert([tradeEntry])
        .select()
        .single();

      if (error) throw error;

      // Generate AI feedback asynchronously
      getAISummaryForTrade(tradeData).then(async (feedback) => {
        await supabase
          .from("trade_journal_entries")
          .update({ ai_positive_feedback: feedback })
          .eq("id", data.id);
      });

      toast({
        title: "Trade Saved",
        description: "Your trade has been logged successfully",
      });
    } catch (error) {
      console.error("Error saving trade:", error);
      toast({
        title: "Error",
        description: "Failed to save trade",
        variant: "destructive",
      });
      throw error;
    }
  }, [user, toast]);

  // Get most traded assets with currency normalization
  const getMostTradedAssets = () => {
    const assetCounts = trades.reduce((acc, trade) => {
      // Normalize currency pairs (e.g., EURUSD, EUR/USD, EUR-USD all become EURUSD)
      const normalizedAsset = trade.asset
        .replace(/[\/\-\s]/g, '')
        .toUpperCase()
        .trim();
      
      acc[normalizedAsset] = (acc[normalizedAsset] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(assetCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([asset, count]) => ({ asset, count }));
  };

  // State for analytics toggle
  const [analyticsView, setAnalyticsView] = useState<"ai" | "most-traded">(
    "ai"
  );

  // Enhanced Dashboard Metrics with more insights
  const EnhancedDashboardMetrics: React.FC<{ metrics: DashboardMetrics }> = ({
    metrics,
  }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card
        className={cn(
          "border-2 transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-slate-900/80 border-slate-700 hover:border-green-500/50"
            : "bg-white border-slate-200 hover:border-green-500/50",
          metrics.totalPnL >= 0 && "border-green-500/30"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total P/L</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  metrics.totalPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                ${metrics.totalPnL.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg: $
                {(metrics.totalPnL / Math.max(metrics.totalTrades, 1)).toFixed(
                  2
                )}
              </p>
            </div>
            <DollarSign
              className={cn(
                "h-8 w-8",
                metrics.totalPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-2 transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-slate-900/80 border-slate-700 hover:border-blue-500/50"
            : "bg-white border-slate-200 hover:border-blue-500/50"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-blue-500">
                {metrics.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((metrics.winRate * metrics.totalTrades) / 100)} wins
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-2 transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-slate-900/80 border-slate-700 hover:border-purple-500/50"
            : "bg-white border-slate-200 hover:border-purple-500/50"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className="text-2xl font-bold text-purple-500">
                {metrics.profitFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.profitFactor > 1.5
                  ? "Excellent"
                  : metrics.profitFactor > 1.0
                  ? "Good"
                  : "Needs Work"}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-2 transition-all duration-300 hover:scale-105",
          theme === "dark"
            ? "bg-slate-900/80 border-slate-700 hover:border-orange-500/50"
            : "bg-white border-slate-200 hover:border-orange-500/50"
        )}
      >
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

    if (
      journalState.currentFilter === "today" ||
      journalState.currentFilter === "all"
    ) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {journalState.currentFilter === "today"
              ? "Today's trades"
              : "All trades"}{" "}
            view
          </p>
        </div>
      );
    }

    if (journalState.currentFilter === "week") {
      const startOfWeek = new Date(journalState.currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const dayTrades = trades.filter((t) => t.date === dateStr);
        const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
        const isFuture = date > today;

        weekDays.push(
          <div
            key={i}
            className={cn(
              "h-24 border border-border p-2 cursor-pointer transition-all duration-200",
              theme === "dark" ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
              isFuture && "opacity-50 cursor-not-allowed",
              dayTrades.length > 0 &&
                (dayPnL >= 0
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30")
            )}
            onClick={(e) =>
              !isFuture && dayTrades.length > 0 && handleDateClick(dateStr, e)
            }
          >
            <div className="text-sm font-medium">{date.getDate()}</div>
            <div className="text-xs text-muted-foreground">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            {dayTrades.length > 0 && (
              <div
                className={cn(
                  "text-xs font-bold mt-1",
                  dayPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                ${dayPnL.toFixed(0)}
              </div>
            )}
          </div>
        );
      }

      return <div className="grid grid-cols-7 gap-2">{weekDays}</div>;
    }

    if (journalState.currentFilter === "year") {
      const year = journalState.currentDate.getFullYear();
      const months = [];

      for (let month = 0; month < 12; month++) {
        const monthTrades = trades.filter((t) => {
          const tradeDate = new Date(t.date);
          return (
            tradeDate.getFullYear() === year && tradeDate.getMonth() === month
          );
        });
        const monthPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
        const monthName = new Date(year, month).toLocaleDateString("en-US", {
          month: "short",
        });

        months.push(
          <div
            key={month}
            className={cn(
              "h-20 border border-border p-2 cursor-pointer transition-all duration-200 flex flex-col justify-center items-center",
              theme === "dark" ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
              monthTrades.length > 0 &&
                (monthPnL >= 0
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30")
            )}
            onClick={() => updateView("month", new Date(year, month, 1))}
          >
            <div className="text-sm font-medium">{monthName}</div>
            {monthTrades.length > 0 && (
              <div
                className={cn(
                  "text-xs font-bold",
                  monthPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                ${monthPnL.toFixed(0)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {monthTrades.length} trades
            </div>
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

    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="h-20" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayTrades = trades.filter((t) => t.date === dateStr);
      const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const isFuture = new Date(dateStr) > today;

      days.push(
        <div
          key={day}
          className={cn(
            "h-20 border border-border p-2 cursor-pointer transition-all duration-200",
            theme === "dark" ? "hover:bg-slate-800/50" : "hover:bg-slate-50",
            isFuture && "opacity-50 cursor-not-allowed",
            dayTrades.length > 0 &&
              (dayPnL >= 0
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30")
          )}
          onClick={(e) =>
            !isFuture && dayTrades.length > 0 && handleDateClick(dateStr, e)
          }
        >
          <div className="text-sm font-medium">{day}</div>
          {dayTrades.length > 0 && (
            <div
              className={cn(
                "text-xs font-bold mt-1",
                dayPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              ${dayPnL.toFixed(0)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  // Simple Equity Curve Chart Component matching reference design
  const EquityCurveChart: React.FC<{
    data: Array<{
      date: string;
      pnl: number;
      tradePnL: number;
      tradeNumber: number;
    }>;
  }> = ({ data }) => {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [mousePosition, setMousePosition] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

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

    const maxPnL = Math.max(...data.map((d) => d.pnl));
    const minPnL = Math.min(...data.map((d) => d.pnl));
    const range = maxPnL - minPnL || 100;
    const padding = range * 0.1;
    const chartHeight = 320;
    const chartWidth = 1000;
    const chartPadding = 30;

    const points = data.map((point, index) => ({
      x:
        chartPadding +
        (index / Math.max(data.length - 1, 1)) *
          (chartWidth - chartPadding * 2),
      y:
        chartPadding +
        (chartHeight - chartPadding * 2 - 40) -
        ((point.pnl - minPnL + padding) / (range + 2 * padding)) *
          (chartHeight - chartPadding * 2 - 40),
      ...point,
    }));

    const generatePath = () => {
      if (points.length < 2) return "";

      let path = `M ${points[0].x} ${points[0].y}`;

      for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];
        const midX = (prevPoint.x + currentPoint.x) / 2;
        const midY = (prevPoint.y + currentPoint.y) / 2;

        path += ` Q ${prevPoint.x} ${prevPoint.y} ${midX} ${midY}`;

        if (i === points.length - 1) {
          path += ` Q ${currentPoint.x} ${currentPoint.y} ${currentPoint.x} ${currentPoint.y}`;
        }
      }

      return path;
    };

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * chartWidth;
      const y = ((event.clientY - rect.top) / rect.height) * chartHeight;

      let closestIndex = 0;
      let closestDistance = Infinity;

      points.forEach((point, index) => {
        const distance = Math.abs(point.x - x);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestDistance < 50) {
        setHoveredPoint(closestIndex);
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      } else {
        setHoveredPoint(null);
        setMousePosition(null);
      }
    };

    const yAxisLabels = [];
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = minPnL + (maxPnL - minPnL) * (i / labelCount);
      const y =
        chartPadding +
        (chartHeight - chartPadding * 2 - 40) -
        ((value - minPnL + padding) / (range + 2 * padding)) *
          (chartHeight - chartPadding * 2 - 40);
      yAxisLabels.push({ value, y });
    }

    return (
      <div className="h-80 w-full relative">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredPoint(null);
            setMousePosition(null);
          }}
        >
          <defs>
            <pattern
              id="grid"
              width="80"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 80 0 L 0 0 0 40"
                fill="none"
                stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            x={chartPadding}
            y={chartPadding}
            width={chartWidth - chartPadding * 2}
            height={chartHeight - chartPadding * 2 - 40}
            fill="url(#grid)"
          />

          {yAxisLabels.map((label, index) => (
            <text
              key={index}
              x={chartPadding - 10}
              y={label.y + 4}
              fontSize="12"
              fill={theme === "dark" ? "#9ca3af" : "#6b7280"}
              textAnchor="end"
            >
              ${label.value.toFixed(0)}
            </text>
          ))}

          {points.map((point, index) => {
            const shouldShowLabel =
              index === 0 ||
              index === points.length - 1 ||
              index % Math.max(1, Math.floor(points.length / 6)) === 0;

            if (shouldShowLabel) {
              return (
                <text
                  key={`date-${index}`}
                  x={point.x}
                  y={chartHeight - 15}
                  fontSize="13"
                  fontWeight="500"
                  fill={theme === "dark" ? "#e5e7eb" : "#374151"}
                  textAnchor="middle"
                >
                  {new Date(point.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </text>
              );
            }
            return null;
          })}

          <motion.path
            d={generatePath()}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          {points.map((point, index) => (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? "5" : "4"}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="transition-all duration-200"
            />
          ))}

          <rect
            x={chartPadding}
            y={chartPadding}
            width={chartWidth - chartPadding * 2}
            height={chartHeight - chartPadding * 2 - 40}
            fill="transparent"
            className="cursor-crosshair"
          />
        </svg>

        {hoveredPoint !== null && mousePosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 pointer-events-none"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
            }}
          >
            <div
              className={cn(
                "px-3 py-2 rounded-lg border shadow-lg text-sm",
                theme === "dark"
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="font-medium">
                Trade #{data[hoveredPoint].tradeNumber}
              </div>
              <div
                className={cn(
                  "font-bold",
                  data[hoveredPoint].tradePnL >= 0
                    ? "text-green-500"
                    : "text-red-500"
                )}
              >
                {data[hoveredPoint].tradePnL >= 0 ? "+" : ""}$
                {data[hoveredPoint].tradePnL.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Total: ${data[hoveredPoint].pnl.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(data[hoveredPoint].date).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        )}

        <div className="absolute top-4 right-4">
          <div className="text-sm text-muted-foreground text-right">
            Current Total
          </div>
          <div
            className={cn(
              "text-2xl font-bold text-right",
              data[data.length - 1]?.pnl >= 0
                ? "text-green-500"
                : "text-red-500"
            )}
          >
            ${data[data.length - 1]?.pnl.toFixed(2) || "0.00"}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Stats Panel with AI insights and Most Traded toggle
  const EnhancedStatsPanel: React.FC = () => {
    const mostTradedData = getMostTradedAssets();
    const colors = ["#ffffff", "#1a1a1a", "#cd7f32", "#2d2d2d", "#8b7355"];

    return (
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card
              className={cn(
                "h-96 ml-4 shadow-sm border-0",
                theme === "dark"
                  ? "bg-slate-900/60 backdrop-blur-sm"
                  : "bg-white/80 backdrop-blur-sm"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {analyticsView === "ai" ? (
                      <>
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                          <Brain className="h-4 w-4 text-blue-500" />
                        </div>
                        AI Analytics
                      </>
                    ) : (
                      <>
                        <div className="p-1.5 rounded-lg bg-orange-500/10">
                          <PieChart className="h-4 w-4 text-orange-500" />
                        </div>
                        Assets
                      </>
                    )}
                  </CardTitle>
                  <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
                    <Button
                      variant={analyticsView === "ai" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAnalyticsView("ai")}
                      className={cn(
                        "h-7 px-3 text-xs transition-all",
                        analyticsView === "ai"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/60"
                      )}
                    >
                      AI
                    </Button>
                    <Button
                      variant={
                        analyticsView === "most-traded" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setAnalyticsView("most-traded")}
                      className={cn(
                        "h-7 px-3 text-xs transition-all",
                        analyticsView === "most-traded"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/60"
                      )}
                    >
                      Assets
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 min-h-[400px] bg-gradient-to-b from-background to-transparent">
                {analyticsView === "ai" ? (
                  <div className="space-y-3 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/30">
                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-green-500/10 mt-0.5">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-green-700 dark:text-green-400 text-sm mb-1">
                            Best Strategy
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Breakout trades show 80% win rate during London
                            session
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-1">
                            Timing Insight
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Your performance peaks during European overlap hours
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 mt-0.5">
                          <Heart className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-orange-700 dark:text-orange-400 text-sm mb-1">
                            Psychology Tip
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Confident entries yield 23% higher profits than
                            anxious ones
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-purple-700 dark:text-purple-400 text-sm mb-1">
                            Risk Management
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Consider 0.5% position sizing for setups below 2:1
                            R/R
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative h-48 flex items-center justify-center">
                      <svg
                        width="160"
                        height="160"
                        viewBox="0 0 160 160"
                        className="transform -rotate-90"
                      >
                        <circle
                          cx="80"
                          cy="80"
                          r="50"
                          fill="none"
                          stroke={theme === "dark" ? "#1a1a1a" : "#e5e7eb"}
                          strokeWidth="18"
                        />
                        {mostTradedData.map((item, index) => {
                          const total = mostTradedData.reduce(
                            (sum, d) => sum + d.count,
                            0
                          );
                          const percentage = (item.count / total) * 100;
                          const circumference = 2 * Math.PI * 50;
                          const strokeDasharray = `${
                            (percentage / 100) * circumference
                          } ${circumference}`;
                          const strokeDashoffset = -mostTradedData
                            .slice(0, index)
                            .reduce((sum, d) => {
                              return sum + (d.count / total) * circumference;
                            }, 0);

                          return (
                            <motion.circle
                              key={item.asset}
                              cx="80"
                              cy="80"
                              r="50"
                              fill="none"
                              stroke={colors[index]}
                              strokeWidth="18"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              initial={{
                                strokeDasharray: `0 ${circumference}`,
                              }}
                              animate={{ strokeDasharray, strokeDashoffset }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold">{trades.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {mostTradedData.map((item, index) => {
                        const total = mostTradedData.reduce(
                          (sum, d) => sum + d.count,
                          0
                        );
                        const percentage = ((item.count / total) * 100).toFixed(
                          1
                        );

                        return (
                          <motion.div
                            key={item.asset}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: colors[index] }}
                              />
                              <span className="text-xs font-medium">
                                {item.asset}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">{item.count}</p>
                              <p className="text-xs text-muted-foreground">
                                {percentage}%
                              </p>
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
    const dayTrades = trades.filter((t) => t.date === date);

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
              onClick={() =>
                setJournalState((prev) => ({
                  ...prev,
                  selectedDate: null,
                  isDayViewActive: false,
                }))
              }
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Calendar
            </Button>
            <h2 className="text-2xl font-bold">
              {new Date(date).toLocaleDateString()}
            </h2>
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
          {dayTrades.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={cn(
                  "border-2 transition-all duration-300 hover:shadow-lg",
                  theme === "dark"
                    ? "bg-slate-900/80 border-slate-700 hover:border-slate-600"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            trade.outcome === "win" ? "default" : "destructive"
                          }
                        >
                          {trade.asset}
                        </Badge>
                        <Badge variant="outline">
                          {trade.direction.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={
                            trade.outcome === "win" ? "default" : "destructive"
                          }
                        >
                          {trade.outcome.toUpperCase()}
                        </Badge>
                        {trade.session && (
                          <Badge variant="secondary">
                            {SESSIONS.find(
                              (s) => s.value === trade.session
                            )?.label.split(" ")[0] || trade.session}
                          </Badge>
                        )}
                      </div>

                      {trade.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {trade.notes}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {trade.strategy && (
                          <div>
                            <span className="font-medium">Strategy:</span>{" "}
                            {trade.strategy}
                          </div>
                        )}
                        {trade.emotion && (
                          <div>
                            <span className="font-medium">Emotion:</span>{" "}
                            {trade.emotion}
                          </div>
                        )}
                        {trade.entry_price && (
                          <div>
                            <span className="font-medium">Entry:</span>{" "}
                            {trade.entry_price}
                          </div>
                        )}
                        {trade.exit_price && (
                          <div>
                            <span className="font-medium">Exit:</span>{" "}
                            {trade.exit_price}
                          </div>
                        )}
                      </div>

                      {trade.ai_feedback && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-600">
                              AI Analysis
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trade.ai_feedback}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-6">
                      <p
                        className={cn(
                          "text-3xl font-bold",
                          trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}
                      >
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

  // Main Dashboard View
  const DashboardView: React.FC = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-600 to-amber-700 bg-clip-text text-transparent">Journal XX</h1>
          <p className="text-muted-foreground">
            Your intelligent trading companion
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2"
        >
          {showStats ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showStats ? "Hide Stats" : "Show Stats"}
        </Button>
      </div>

      <EnhancedDashboardMetrics metrics={metrics} />

      <div className="flex gap-4">
        <div className="flex-1 space-y-6">
          <Card
            className={cn(
              "h-96",
              theme === "dark"
                ? "bg-slate-900/80 border-slate-700"
                : "bg-white border-slate-200"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Equity Curve (
                {journalState.currentFilter.charAt(0).toUpperCase() +
                  journalState.currentFilter.slice(1)}
                )
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquityCurveChart data={getEquityCurveData()} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(["today", "week", "month", "year", "all"] as ViewType[]).map(
                (view) => (
                  <Button
                    key={view}
                    variant={
                      journalState.currentFilter === view
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => updateView(view)}
                    className="capitalize"
                  >
                    {view}
                  </Button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateView(
                    undefined,
                    new Date(
                      journalState.currentDate.getFullYear(),
                      journalState.currentDate.getMonth() - 1,
                      1
                    )
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {journalState.currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateView(
                    undefined,
                    new Date(
                      journalState.currentDate.getFullYear(),
                      journalState.currentDate.getMonth() + 1,
                      1
                    )
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card
            className={cn(
              theme === "dark"
                ? "bg-slate-900/80 border-slate-700"
                : "bg-white border-slate-200"
            )}
          >
            <CardContent className="p-6">
              <DynamicCalendarView />
            </CardContent>
          </Card>

          <Card
            className={cn(
              theme === "dark"
                ? "bg-slate-900/80 border-slate-700"
                : "bg-white border-slate-200"
            )}
          >
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trades.slice(0, 5).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          trade.outcome === "win" ? "default" : "destructive"
                        }
                      >
                        {trade.asset}
                      </Badge>
                      <span className="text-sm">
                        {trade.direction.toUpperCase()}
                      </span>
                      {trade.strategy && (
                        <span className="text-xs text-muted-foreground">
                          {trade.strategy}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-bold",
                        trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      ${trade.pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <EnhancedStatsPanel />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 transition-colors duration-300 bg-transparent border-border"
    >
      <AnimatePresence mode="wait">
        {journalState.selectedDate ? (
          <EnhancedDayView key="day-view" date={journalState.selectedDate} />
        ) : (
          <DashboardView key="dashboard-view" />
        )}
      </AnimatePresence>

      <AddTradeModal
        isOpen={showAddTradeModal}
        onClose={() => setShowAddTradeModal(false)}
        onSave={handleSaveTrade}
        selectedDate={journalState.selectedDate || undefined}
      />
    </div>
  );
};

export default TradingJournalApp;
