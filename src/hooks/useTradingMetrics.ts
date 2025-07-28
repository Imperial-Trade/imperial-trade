import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TradingMetrics {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  riskScore: number;
  tradingVolume: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  portfolioValue: number;
}

export const useTradingMetrics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trading-metrics', user?.id],
    queryFn: async (): Promise<TradingMetrics> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch trade journal entries for calculations
      const { data: trades, error: tradesError } = await supabase
        .from('trade_journal_entries')
        .select('pnl, trade_type, entry_price, exit_price, position_size, trade_date')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });

      if (tradesError) throw tradesError;

      // Fetch portfolio items for portfolio value
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('quantity, avg_buy_price')
        .eq('user_id', user.id);

      if (portfolioError) throw portfolioError;

      const validTrades = trades?.filter(t => t.pnl !== null && t.pnl !== undefined) || [];
      const winningTrades = validTrades.filter(t => t.pnl > 0);
      const losingTrades = validTrades.filter(t => t.pnl < 0);

      // Calculate metrics
      const totalTrades = validTrades.length;
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const totalPnL = validTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length) : 0;
      
      // Calculate consecutive wins/losses
      let consecutiveWins = 0;
      let consecutiveLosses = 0;
      let currentStreak = 0;
      let maxConsecutiveWins = 0;
      let maxConsecutiveLosses = 0;

      for (const trade of validTrades) {
        if (trade.pnl > 0) {
          if (currentStreak >= 0) {
            currentStreak++;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
          } else {
            currentStreak = 1;
          }
        } else if (trade.pnl < 0) {
          if (currentStreak <= 0) {
            currentStreak--;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, Math.abs(currentStreak));
          } else {
            currentStreak = -1;
          }
        }
      }

      consecutiveWins = maxConsecutiveWins;
      consecutiveLosses = maxConsecutiveLosses;

      // Calculate profit factor
      const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

      // Calculate max drawdown (simplified)
      let peak = 0;
      let maxDrawdown = 0;
      let runningPnL = 0;

      for (const trade of validTrades.reverse()) {
        runningPnL += trade.pnl;
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        const drawdown = peak - runningPnL;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Calculate risk score (1-10, lower is better)
      const riskScore = Math.min(10, Math.max(1, 
        5 + 
        (maxDrawdown / Math.abs(totalPnL) * 2) + 
        ((100 - winRate) / 20) - 
        (profitFactor > 1 ? 1 : 0)
      ));

      // Calculate portfolio value
      const portfolioValue = portfolio?.reduce((sum, item) => {
        return sum + (item.quantity * item.avg_buy_price);
      }, 0) || 0;

      // Trading volume
      const tradingVolume = validTrades.reduce((sum, trade) => {
        const volume = trade.position_size && trade.entry_price ? 
          Math.abs(trade.entry_price * trade.position_size) : 
          Math.abs(trade.pnl * 10);
        return sum + volume;
      }, 0);

      return {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        avgWin: Math.round(avgWin * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        riskScore: Math.round(riskScore * 10) / 10,
        tradingVolume: Math.round(tradingVolume * 100) / 100,
        consecutiveWins,
        consecutiveLosses,
        profitFactor: Math.round(profitFactor * 100) / 100,
        bestTrade: validTrades.length > 0 ? Math.max(...validTrades.map(t => t.pnl)) : 0,
        worstTrade: validTrades.length > 0 ? Math.min(...validTrades.map(t => t.pnl)) : 0,
        portfolioValue: Math.round(portfolioValue * 100) / 100
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
};