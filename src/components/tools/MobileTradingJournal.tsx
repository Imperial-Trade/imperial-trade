import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BarChart3, Clock, Calendar, TrendingUp, TrendingDown, Target, Zap, Home, Activity } from 'lucide-react';
import MobileJournalForm from './mobile/MobileJournalForm';
import MobileRecentTrades from './mobile/MobileRecentTrades';
import MobileAnalytics from './mobile/MobileAnalytics';
import MobileEquityCurve from './mobile/MobileEquityCurve';
import MobileAIAnalytics from './mobile/MobileAIAnalytics';
import MobileCalendarView from './mobile/MobileCalendarView';
import MobileDayView from './mobile/MobileDayView';
import { JournalSidebarMenu } from './JournalSidebarMenu';
type MobileTab = 'overview' | 'add' | 'history' | 'analytics' | 'calendar' | 'day';
interface MobileTradingJournalProps {
  entries: any[];
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate key metrics for overview
  const metrics = useMemo(() => {
    if (!entries.length) return {
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      bestTrade: 0,
      worstTrade: 0,
      winStreak: 0,
      lossStreak: 0
    };
    const totalPnL = entries.reduce((sum, entry) => sum + (entry.pnl || 0), 0);
    const wins = entries.filter(entry => (entry.pnl || 0) > 0).length;
    const losses = entries.filter(entry => (entry.pnl || 0) < 0).length;
    const winRate = wins / entries.length * 100;
    const bestTrade = Math.max(...entries.map(entry => entry.pnl || 0));
    const worstTrade = Math.min(...entries.map(entry => entry.pnl || 0));

    // Calculate current streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let isWinStreak = true;
    for (let i = entries.length - 1; i >= 0; i--) {
      const pnl = entries[i].pnl || 0;
      if (pnl > 0) {
        if (isWinStreak) currentWinStreak++;else break;
        isWinStreak = true;
      } else if (pnl < 0) {
        if (!isWinStreak) currentLossStreak++;else break;
        isWinStreak = false;
      } else {
        break;
      }
    }
    return {
      totalPnL,
      winRate,
      totalTrades: entries.length,
      bestTrade,
      worstTrade,
      winStreak: currentWinStreak,
      lossStreak: currentLossStreak,
      wins,
      losses
    };
  }, [entries]);
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setActiveTab('day');
  };
  const handleBackFromDay = () => {
    setSelectedDate(null);
    setActiveTab('calendar');
  };
  const handleBackFromCalendar = () => {
    setActiveTab('overview');
  };
  const OverviewContent = <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="space-y-4 pb-24 mx-0 my-[50px]">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Total P&L</span>
            </div>
            <p className={`text-xl font-bold ${metrics.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.wins}W / {metrics.losses}L
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
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalTrades} total trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
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
            <Zap className="w-5 h-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MobileAIAnalytics entries={entries} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Quick Access</p>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 p-0 h-auto font-medium" onClick={() => setActiveTab('add')}>
                Add Trade →
              </Button>
            </div>
            <Plus className="w-5 h-5 text-primary" />
          </div>
          
          <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Calendar</p>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 p-0 h-auto font-medium" onClick={() => setActiveTab('calendar')}>
                View Calendar →
              </Button>
            </div>
            <Calendar className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Recent Trades Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Trades
            <Badge variant="secondary" className="ml-auto">
              {entries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MobileRecentTrades entries={entries.slice(0, 3)} onDelete={onDelete} showAll={false} />
          {entries.length > 3 && <Button variant="outline" size="sm" onClick={() => setActiveTab('history')} className="w-full mt-3">
              View All Trades ({entries.length})
            </Button>}
        </CardContent>
      </Card>
    </motion.div>;
  const renderContent = () => {
    switch (activeTab) {
      case 'add':
        return <MobileJournalForm onSubmit={onSubmit} isSubmitting={isSubmitting} onBack={() => setActiveTab('overview')} />;
      case 'history':
        return <MobileRecentTrades entries={entries} onDelete={onDelete} showAll={true} />;
      case 'analytics':
        return <MobileAnalytics entries={entries} />;
      case 'calendar':
        return <MobileCalendarView entries={entries} onDateSelect={handleDateSelect} onBack={handleBackFromCalendar} selectedDate={selectedDate} />;
      case 'day':
        return selectedDate ? <MobileDayView date={selectedDate} entries={entries} onBack={handleBackFromDay} onDelete={onDelete} /> : null;
      default:
        return OverviewContent;
    }
  };
  return <div className="min-h-screen bg-background relative">
      {/* Header - only show for main views */}
      {!['calendar', 'day'].includes(activeTab)}

      {/* Content */}
      <div className={`${!['calendar', 'day'].includes(activeTab) ? 'px-4 pt-4' : ''}`}>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>


      {/* Floating Add Button */}
      {!['add', 'calendar', 'day'].includes(activeTab) && <motion.div initial={{
      scale: 0
    }} animate={{
      scale: 1
    }} className="fixed bottom-6 right-4 z-40">
          
        </motion.div>}
    </div>;
}