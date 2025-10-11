import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Search, TrendingUp, TrendingDown, Eye, Edit, Trash2, BarChart3, Signal, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditSignalForm from '@/components/signals/EditSignalForm';
import { NotesEditModal } from '@/components/signals/NotesEditModal';
import { calculatePipsFromPrice } from '@/utils/pipCalculations';
import { sanitizeDatabasePayload } from '@/lib/validations/sanitization';
import { tradingApiService } from '@/api/services/TradingApiService';
import type { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface AdminSignalAnalytics {
  total_signals: number;
  win_rate: number;
  total_pips_gained: number;
  total_pips_lost: number;
}

export function AdminSignalManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshAlerts } = useOptimizedTrading(user?.id || '', false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState<AdminSignalAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [viewingAlert, setViewingAlert] = useState<any>(null);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editingNotesAlert, setEditingNotesAlert] = useState<any>(null);
  const [userSignals, setUserSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  // Fetch user's own signals
  const fetchUserSignals = async () => {
    if (!user?.id) {
      setIsLoadingSignals(false);
      return;
    }

    try {
      setIsLoadingSignals(true);
      
      const { data: signalsData, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (signalsError) throw signalsError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, user_type, access_level')
        .eq('id', user.id)
        .single();

      if (profileError) console.warn('Profile fetch error:', profileError);

      const mappedSignals = (signalsData || []).map((signal: any) => ({
        id: signal.id,
        userId: signal.user_id,
        assetName: signal.asset_name,
        tradermadeSymbol: signal.tradermade_symbol,
        tradeType: signal.trade_type,
        entryPrice: signal.entry_price,
        stopLoss: signal.stop_loss,
        status: signal.status,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        tp4: signal.tp4,
        tp5: signal.tp5,
        tpHits: signal.tp_hits || [],
        notes: signal.notes,
        closeReason: signal.close_reason,
        createdAt: signal.created_at,
        updatedAt: signal.updated_at,
        creator: profileData ? {
          id: profileData.id,
          display_name: profileData.display_name,
          role: profileData.role,
          avatar_url: profileData.avatar_url,
          user_type: profileData.user_type,
          access_level: profileData.access_level
        } : null
      }));

      setUserSignals(mappedSignals);
    } catch (error: any) {
      console.error('Error fetching user signals:', error);
      toast({
        title: "Error Loading Signals",
        description: error?.message || "Failed to load your signals",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchUserSignals();
  }, [user?.id]);

  // Calculate signal pips
  const calculateSignalPips = (signal: any): { gained: number; lost: number } => {
    const { 
      entry_price, 
      stop_loss, 
      tp1, tp2, tp3, tp4, tp5, 
      tp_hits, 
      tradermade_symbol, 
      trade_type,
      close_reason 
    } = signal;

    let pipsGained = 0;
    let pipsLost = 0;

    if (close_reason === 'stop_loss' && stop_loss && entry_price) {
      const lossPips = calculatePipsFromPrice(entry_price, stop_loss, tradermade_symbol);
      pipsLost = lossPips;
    } else if (tp_hits?.length > 0) {
      const tpPrices: Record<number, number> = { 1: tp1, 2: tp2, 3: tp3, 4: tp4, 5: tp5 };
      const highestTPHit = Math.max(...tp_hits);
      const highestTPPrice = tpPrices[highestTPHit];
      
      if (highestTPPrice && entry_price) {
        const gainPips = calculatePipsFromPrice(entry_price, highestTPPrice, tradermade_symbol);
        const isBuy = trade_type === 'buy' || trade_type === 'buy_limit';
        const isProfit = isBuy ? highestTPPrice > entry_price : highestTPPrice < entry_price;
        
        if (isProfit) {
          pipsGained = gainPips;
        } else {
          pipsLost = gainPips;
        }
      }
    }

    return { gained: pipsGained, lost: pipsLost };
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      if (!user?.id) {
        setLoadingAnalytics(false);
        return;
      }

      const { data: signalStats, error: signalError } = await supabase
        .from('trade_alerts')
        .select('status, user_id, tp_hits, created_at, entry_price, stop_loss, tp1, tp2, tp3, tp4, tp5, tradermade_symbol, trade_type, close_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (signalError) throw signalError;

      const totalSignals = signalStats?.length || 0;
      const closedSignals = signalStats?.filter(s => s.status === 'closed') || [];
      const closedSignalsCount = closedSignals.length;
      
      const winningSignals = closedSignals.filter(s => 
        s.tp_hits?.length > 0 && s.tp_hits.some((hit: number) => hit >= 1)
      ).length;
      const winRate = closedSignalsCount > 0 ? (winningSignals / closedSignalsCount) * 100 : 0;
      
      let totalPipsGained = 0;
      let totalPipsLost = 0;
      
      closedSignals.forEach(signal => {
        const { gained, lost } = calculateSignalPips(signal);
        totalPipsGained += gained;
        totalPipsLost += lost;
      });

      setAnalytics({
        total_signals: totalSignals,
        win_rate: winRate,
        total_pips_gained: Math.round(totalPipsGained * 10) / 10,
        total_pips_lost: Math.round(totalPipsLost * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.id]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return userSignals.filter(alert => {
      const matchesSearch = 
        alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        alert.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        alert.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [userSignals, searchTerm]);

  // Signal handlers
  const handleDeleteSignal = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this signal? This action cannot be undone.') || !user?.id) return;
    
    try {
      const result = await tradingApiService.deleteAlert(alertId, user.id);
      if (!result.success) throw new Error(result.error || 'Failed to delete signal');
      
      toast({ title: "Success", description: "Signal deleted successfully" });
      await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete signal",
        variant: "destructive"
      });
    }
  };

  const handleEditSignal = async (updateData: any) => {
    if (!editingAlert || !user?.id) return;
    
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: updateData.status,
        notes: updateData.notes,
        tpHits: updateData.tpHits,
        closeReason: updateData.closeReason
      };

      const result = await tradingApiService.updateAlert(editingAlert.id, updateDto, user.id);
      if (!result.success) throw new Error(result.error || 'Failed to update signal');

      toast({ title: "Success", description: "Signal updated successfully" });
      setEditingAlert(null);
      await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
    } catch (error) {
      console.error('Error updating signal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update signal",
        variant: "destructive"
      });
    }
  };

  const handleCloseSignal = async (alertId: string) => {
    const signal = userSignals.find(s => s.id === alertId);
    const confirmMsg = signal?.status === 'pending' 
      ? 'Are you sure you want to cancel this pending order?' 
      : 'Are you sure you want to close this active signal?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const updatePayload = sanitizeDatabasePayload({
        status: 'closed' as const,
        close_reason: 'manual' as const,
        updated_at: new Date().toISOString()
      });
      
      const { error } = await supabase
        .from('trade_alerts')
        .update(updatePayload)
        .eq('id', alertId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: signal?.status === 'pending' ? "Pending order cancelled successfully" : "Signal closed successfully"
      });
      
      await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
    } catch (error) {
      console.error('Error closing signal:', error);
      toast({
        title: "Error",
        description: "Failed to close signal",
        variant: "destructive"
      });
    }
  };

  // Render signal card with new glassmorphism design
  const renderSignalCard = (alert: any, index: number) => (
    <motion.div
      key={alert.id}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="signal-card-container"
    >
      <div className="glass-card p-4 flex flex-col gap-4">
        {/* Top Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{alert.assetName}</h3>
              <span className="bg-muted text-muted-foreground text-xs font-semibold px-2 py-1 rounded-full">
                {alert.tradermadeSymbol}
              </span>
            </div>
            {alert.creator && (
              <span className="tag bg-gray-500/20 text-gray-300 text-[10px] sm:text-xs">
                by {alert.creator.display_name || 'Unknown'}
              </span>
            )}
          </div>
          
          {/* Status Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            {alert.status === 'closed' && (
              <span className="tag bg-blue-500/20 text-blue-300 border border-blue-500/50">
                <CheckCircle className="w-3 h-3" />
                CLOSED
              </span>
            )}
            {alert.status === 'active' && (
              <span className="tag bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                <Clock className="w-3 h-3" />
                ACTIVE
              </span>
            )}
            {alert.status === 'pending' && (
              <span className="tag bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                <Clock className="w-3 h-3" />
                PENDING
              </span>
            )}
            
            {/* Performance Badge */}
            {alert.status === 'closed' && alert.tpHits?.length > 0 && (
              <span className="tag bg-green-500/20 text-green-300 border border-green-500/50">
                <CheckCircle className="w-3 h-3" />
                TP REACHED
              </span>
            )}
            
            {/* Trade Type Badge */}
            {alert.tradeType.includes('buy') ? (
              <span className="tag buy-indicator">
                <TrendingUp className="w-3 h-3" />
                {alert.tradeType.toUpperCase()}
              </span>
            ) : (
              <span className="tag sell-indicator">
                <TrendingDown className="w-3 h-3" />
                {alert.tradeType.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Price Section */}
        <div className="grid grid-cols-3 text-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Entry Price</p>
            <p className="font-semibold text-foreground text-sm sm:text-base truncate">{alert.entryPrice}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Stop Loss</p>
            <p className="font-semibold text-red-400 text-sm sm:text-base truncate">{alert.stopLoss}</p>
          </div>
          {alert.tp1 && (
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">TP1</p>
              <p className="font-semibold text-green-400 text-sm sm:text-base truncate">{alert.tp1}</p>
            </div>
          )}
        </div>

        <hr className="border-border/60" />

        {/* Meta and Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(alert.updatedAt).toLocaleDateString()}</span>
          </div>
          
          {/* Action Buttons */}
          <div className={`grid ${alert.status === 'closed' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <button onClick={() => setViewingAlert(alert)} className="action-btn">
              <Eye className="w-4 h-4" />
              View
            </button>
            
            {alert.status !== 'closed' && (
              <button onClick={() => handleCloseSignal(alert.id)} className="action-btn-close">
                <XCircle className="w-4 h-4" />
                Close
              </button>
            )}
            
            <button 
              onClick={() => handleDeleteSignal(alert.id)} 
              className="action-btn hover:bg-red-500/20 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (isLoadingSignals || loadingAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md lg:max-w-none mx-auto px-4 sm:px-6 lg:px-8" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Signal Management</h1>
        <button 
          onClick={() => window.open('/dashboard/new-signal', '_blank')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg transition-transform transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Create</span>
        </button>
      </header>

      {/* Desktop Two-Column Layout / Mobile Single Column */}
      <div className="lg:flex lg:gap-8 lg:items-start">
        {/* LEFT SIDEBAR - Fixed on Desktop, Normal Flow on Mobile */}
        <aside className="space-y-6 lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
          {/* Overall Performance Card */}
          {analytics && (
            <div className="glass-card p-6 lg:p-8 bg-[#2a2d3e]/60 border-slate-600/40">
              <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 text-foreground">Overall Performance</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:gap-y-6">
                {/* Win Rate */}
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="bg-blue-500/30 p-2 lg:p-3 rounded-full flex-shrink-0">
                    <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" stroke="#3b82f6" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs lg:text-sm text-gray-300 truncate">Win Rate</p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">{analytics.win_rate.toFixed(1)}%</p>
                  </div>
                </div>
                
                {/* Pips Gained */}
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="bg-green-500/30 p-2 lg:p-3 rounded-full flex-shrink-0">
                    <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" stroke="#22c55e" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs lg:text-sm text-gray-300 truncate">Pips Gained</p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-green-400 truncate">+{analytics.total_pips_gained}</p>
                  </div>
                </div>
                
                {/* Total Signals */}
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="bg-gray-400/30 p-2 lg:p-3 rounded-full flex-shrink-0">
                    <Signal className="w-5 h-5 lg:w-6 lg:h-6" stroke="#9ca3af" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs lg:text-sm text-gray-300 truncate">Total Signals</p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">{analytics.total_signals}</p>
                  </div>
                </div>
                
                {/* Pips Lost */}
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="bg-red-500/30 p-2 lg:p-3 rounded-full flex-shrink-0">
                    <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6" stroke="#ef4444" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs lg:text-sm text-gray-300 truncate">Pips Lost</p>
                    <p className="text-base sm:text-lg lg:text-2xl font-bold text-red-400 truncate">-{analytics.total_pips_lost}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters - Horizontal on Mobile, Vertical on Desktop */}
          <Tabs defaultValue="my-signals" className="w-full">
            <TabsList className="flex lg:flex-col items-stretch p-1.5 rounded-xl bg-[#2a2d3e] backdrop-blur-sm border border-slate-600/50 flex-nowrap lg:flex-wrap gap-1 lg:gap-2 w-full h-auto overflow-hidden">
              <TabsTrigger 
                value="my-signals" 
                className="flex-1 lg:w-full text-center text-xs lg:text-sm py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:bg-slate-700/60 data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-slate-600/50 data-[state=active]:text-white whitespace-nowrap"
              >
                ALL <span className="ml-1">({filteredAlerts.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="flex-1 lg:w-full text-center text-xs lg:text-sm py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:bg-slate-700/60 data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-slate-600/50 data-[state=active]:text-white whitespace-nowrap"
              >
                Pending <span className="ml-1">({filteredAlerts.filter(a => a.status === 'pending').length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="active" 
                className="flex-1 lg:w-full text-center text-xs lg:text-sm py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:bg-slate-700/60 data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-slate-600/50 data-[state=active]:text-white whitespace-nowrap"
              >
                Active <span className="ml-1">({filteredAlerts.filter(a => a.status === 'active' || a.status === 'partially_profited').length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="closed" 
                className="flex-1 lg:w-full text-center text-xs lg:text-sm py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:bg-slate-700/60 data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-slate-600/50 data-[state=active]:text-white whitespace-nowrap"
              >
                Closed <span className="ml-1">({filteredAlerts.filter(a => a.status === 'closed').length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Search and Refresh */}
            <div className="flex gap-3 lg:gap-4 mt-6">
              <div className="relative flex-grow">
                <Input 
                  type="text" 
                  placeholder="Search by asset..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-3 pl-10 pr-4 text-sm lg:text-base text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
              </div>
              <button 
                onClick={() => fetchUserSignals()}
                className="flex-shrink-0 flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 bg-slate-800/50 border border-slate-700 rounded-full text-gray-300 hover:bg-slate-700/50 transition"
              >
                <RefreshCw className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </Tabs>
        </aside>

        {/* RIGHT CONTENT - Scrollable Grid on Desktop */}
        <main className="flex-1 mt-6 lg:mt-0">
          <Tabs defaultValue="my-signals" className="w-full">
            {/* Desktop: 2-column grid, Mobile: single column */}
            <TabsContent value="my-signals" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <AnimatePresence>
                  {filteredAlerts.map((alert, index) => renderSignalCard(alert, index))}
                </AnimatePresence>
              </div>
              {filteredAlerts.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Signal className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Signals Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? 'No signals match your search criteria.' : 'You haven\'t created any trading signals yet.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <AnimatePresence>
                {filteredAlerts.filter(a => a.status === 'pending').map((alert, index) => renderSignalCard(alert, index))}
              </AnimatePresence>
            </div>
            {filteredAlerts.filter(a => a.status === 'pending').length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Signals</h3>
                  <p className="text-muted-foreground">You don't have any pending limit orders.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <AnimatePresence>
                {filteredAlerts.filter(a => a.status === 'active' || a.status === 'partially_profited').map((alert, index) => renderSignalCard(alert, index))}
              </AnimatePresence>
            </div>
            {filteredAlerts.filter(a => a.status === 'active' || a.status === 'partially_profited').length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Signals</h3>
                  <p className="text-muted-foreground">You don't have any active trading signals.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

            <TabsContent value="closed" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <AnimatePresence>
                  {filteredAlerts.filter(a => a.status === 'closed').map((alert, index) => renderSignalCard(alert, index))}
                </AnimatePresence>
              </div>
              {filteredAlerts.filter(a => a.status === 'closed').length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Closed Signals</h3>
                    <p className="text-muted-foreground">You don't have any closed trading signals yet.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* View Signal Modal */}
      <Dialog open={!!viewingAlert} onOpenChange={() => setViewingAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signal Details</DialogTitle>
            <DialogDescription>Comprehensive view of your trading signal</DialogDescription>
          </DialogHeader>
          
          {viewingAlert && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{viewingAlert.assetName}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Symbol</p>
                    <p className="font-mono">{viewingAlert.tradermadeSymbol}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trade Type</p>
                    <p className="font-semibold">{viewingAlert.tradeType.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entry Price</p>
                    <p className="font-mono">${viewingAlert.entryPrice}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="text-red-400 font-mono">${viewingAlert.stopLoss}</p>
                  </div>
                </div>
              </div>

              {viewingAlert.notes && (
                <div>
                  <h4 className="font-semibold mb-3">Notes</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">{viewingAlert.notes}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(viewingAlert.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p>{new Date(viewingAlert.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Edit Modal */}
      {editingNotesAlert && (
        <NotesEditModal
          alert={editingNotesAlert}
          isOpen={!!editingNotesAlert}
          onClose={() => setEditingNotesAlert(null)}
          onSave={async () => {
            await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
            setEditingNotesAlert(null);
          }}
        />
      )}

      {/* Edit Signal Modal */}
      <Dialog open={!!editingAlert} onOpenChange={() => setEditingAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Signal</DialogTitle>
            <DialogDescription>Update your trading signal details and status</DialogDescription>
          </DialogHeader>
          {editingAlert && (
            <EditSignalForm 
              alert={editingAlert} 
              onSubmit={handleEditSignal} 
              onCancel={() => setEditingAlert(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
