import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BarChart3, Calendar, TrendingUp, PieChart, Brain, History, Target, DollarSign } from 'lucide-react';
import { TradeJournalEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import { UploadFile } from '@/api/integrations';
import { compressImage, validateImageFile } from '@/utils/imageCompression';
import { toast } from 'sonner';
import MobileJournalForm from './mobile/MobileJournalForm';
import MobileAnalytics from './mobile/MobileAnalytics';
import MobileRecentTrades from './mobile/MobileRecentTrades';
import MobileEquityCurve from './mobile/MobileEquityCurve';
import MobileAIAnalytics from './mobile/MobileAIAnalytics';

type MobileTab = 'overview' | 'add' | 'history' | 'analytics';

interface MobileTradingJournalProps {
  entries: TradeJournalEntry[];
  isSubmitting: boolean;
  isLoading: boolean;
  onSubmit: (data: any) => void;
  onDelete: (entryId: string) => void;
  userProfile: any;
}

export default function MobileTradingJournal({
  entries,
  isSubmitting,
  isLoading,
  onSubmit,
  onDelete,
  userProfile
}: MobileTradingJournalProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('overview');
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate key metrics for overview
  const metrics = useMemo(() => {
    if (!entries.length) return { totalPnL: 0, winRate: 0, totalTrades: 0, bestTrade: 0, worstTrade: 0 };

    const totalPnL = entries.reduce((sum, entry) => sum + entry.pnl, 0);
    const wins = entries.filter(entry => entry.pnl > 0).length;
    const winRate = (wins / entries.length) * 100;
    const bestTrade = Math.max(...entries.map(entry => entry.pnl));
    const worstTrade = Math.min(...entries.map(entry => entry.pnl));

    return { totalPnL, winRate, totalTrades: entries.length, bestTrade, worstTrade };
  }, [entries]);

  const handleAddTrade = useCallback((data: any) => {
    onSubmit(data);
    setShowAddForm(false);
  }, [onSubmit]);

  const OverviewContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-20"
    >
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Total P&L</span>
            </div>
            <p className={`text-xl font-bold ${metrics.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Win Rate</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{metrics.winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MobileEquityCurve entries={entries} />
        </CardContent>
      </Card>

      {/* AI Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MobileAIAnalytics entries={entries} />
        </CardContent>
      </Card>

      {/* Recent Trades Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Trades
            <Badge variant="secondary" className="ml-auto">
              {entries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MobileRecentTrades entries={entries.slice(0, 3)} onDelete={onDelete} showAll={false} />
          {entries.length > 3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('history')}
              className="w-full mt-3"
            >
              View All Trades
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent />;
      case 'add':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-20"
          >
            <MobileJournalForm onSubmit={handleAddTrade} isSubmitting={isSubmitting} />
          </motion.div>
        );
      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-20"
          >
            <MobileRecentTrades entries={entries} onDelete={onDelete} showAll={true} />
          </motion.div>
        );
      case 'analytics':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-20"
          >
            <MobileAnalytics entries={entries} />
          </motion.div>
        );
      default:
        return <OverviewContent />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Trading Journal</h1>
          <Button
            size="sm"
            onClick={() => setActiveTab('add')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Trade
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="grid grid-cols-4 px-4 py-2">
          {[
            { key: 'overview', icon: PieChart, label: 'Overview' },
            { key: 'add', icon: Plus, label: 'Add Trade' },
            { key: 'history', icon: History, label: 'History' },
            { key: 'analytics', icon: BarChart3, label: 'Analytics' }
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as MobileTab)}
              className={`flex flex-col items-center py-2 px-1 transition-colors ${
                activeTab === key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
              {activeTab === key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Add Button (Alternative) */}
      <AnimatePresence>
        {activeTab !== 'add' && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setActiveTab('add')}
            className="fixed bottom-20 right-4 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}