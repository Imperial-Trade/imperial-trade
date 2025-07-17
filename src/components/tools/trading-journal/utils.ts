import { Trade, DashboardMetrics } from './types';

export const calculateMetrics = (filteredTrades: Trade[]): DashboardMetrics => {
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

export const sampleTrades: Trade[] = [
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