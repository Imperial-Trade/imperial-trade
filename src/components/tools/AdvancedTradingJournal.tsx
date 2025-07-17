
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// Import components
import { EnhancedDashboardMetrics } from './trading-journal/DashboardMetrics';
import { AddTradeModal } from './trading-journal/AddTradeModal';
import { TradesList } from './trading-journal/TradesList';
import { PerformanceChart } from './trading-journal/PerformanceChart';
import { Trade, JournalState } from './trading-journal/types';
import { calculateMetrics, sampleTrades } from './trading-journal/utils';

export const TradingJournalApp: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // State management
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

  const metrics = calculateMetrics(trades);

  const handleSaveTrade = () => {
    console.log('Saving trade:', newTrade);
    setShowAddTradeModal(false);
    setNewTrade({});
  };

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
      {showStats && <EnhancedDashboardMetrics metrics={metrics} />}

      {/* Main Content */}
      <div className="grid gap-6">
        <PerformanceChart />
        <TradesList trades={trades} onAddTrade={() => setShowAddTradeModal(true)} />
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
      <DashboardView />
      <AddTradeModal
        isOpen={showAddTradeModal}
        onClose={() => setShowAddTradeModal(false)}
        newTrade={newTrade}
        onTradeChange={setNewTrade}
        onSave={handleSaveTrade}
      />
    </div>
  );
};

export default TradingJournalApp;
