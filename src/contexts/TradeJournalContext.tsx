import React, { createContext, useContext, ReactNode } from 'react';
import { useTradeJournalEntries } from '@/hooks/useTradeJournalEntries';

interface TradeJournalEntry {
  id: string;
  user_id: string;
  asset_ticker: string;
  trade_type: string;
  pnl: number;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  trade_date: string;
  notes?: string;
  screenshot_url?: string;
  screenshot_urls?: string[];
  ai_positive_feedback?: string;
  followed_plan?: boolean;
  target_hit_by_market?: boolean;
  planned_target_price?: number;
  planned_stop_loss?: number;
  revenge_trade?: boolean;
  strategy?: string;
  session?: string;
  emotion?: string;
  coach_status?: 'pending' | 'ready';
  processing_status?: 'pending' | 'analyzing' | 'complete' | 'failed';
  is_synced?: boolean; // Whether trade was synced from broker
  broker_connection_id?: string; // ID of broker connection if synced
  broker_trade_id?: string; // MT5 deal ticket when synced from broker (auto journal)
  entry_time?: string; // ISO string for entry time (for auto journal trades)
  exit_time?: string; // ISO string for exit time (for auto journal trades)
  created_at: string;
  updated_at: string;
}

interface TradeJournalContextType {
  entries: TradeJournalEntry[];
  isLoading: boolean;
  error: string | null;
  refreshEntries: () => Promise<void>;
  addOptimisticEntry: (entry: TradeJournalEntry) => void;
  updateOptimisticEntry: (id: string, updates: Partial<TradeJournalEntry>) => void;
  removeOptimisticEntry: (id: string) => void;
}

const TradeJournalContext = createContext<TradeJournalContextType | undefined>(undefined);

interface TradeJournalProviderProps {
  children: ReactNode;
}

export const TradeJournalProvider: React.FC<TradeJournalProviderProps> = ({ children }) => {
  const journalData = useTradeJournalEntries();
  
  return (
    <TradeJournalContext.Provider value={journalData}>
      {children}
    </TradeJournalContext.Provider>
  );
};

export const useTradeJournal = (): TradeJournalContextType => {
  const context = useContext(TradeJournalContext);
  if (context === undefined) {
    // Optional temporary soft-fail feature flag for staged rollouts
    if (import.meta.env.VITE_TJ_SOFT_CONTEXT === 'true') {
      console.error('useTradeJournal called outside TradeJournalProvider');
      return {
        entries: [],
        isLoading: false,
        error: null,
        refreshEntries: async () => {},
        addOptimisticEntry: () => {},
        updateOptimisticEntry: () => {},
        removeOptimisticEntry: () => {},
      };
    }
    throw new Error('useTradeJournal must be used within a TradeJournalProvider');
  }
  return context;
};

export type { TradeJournalEntry };