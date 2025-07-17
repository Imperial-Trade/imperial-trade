export interface Trade {
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

export interface DashboardMetrics {
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}

export type ViewType = 'today' | 'week' | 'month' | 'year' | 'all';

export interface JournalState {
  currentDate: Date;
  currentFilter: ViewType;
  journalEntries: Map<string, Trade[]>;
  selectedDate: string | null;
  isLoading: boolean;
  isDayViewActive: boolean;
}