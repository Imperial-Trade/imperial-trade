import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Trash2, 
  BarChart3, 
  Signal, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  SlidersHorizontal,
  X,
  MoreVertical,
  ChevronDown,
  Loader2,
  Target,
  DollarSign,
  Activity,
  Zap,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Timer,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditSignalForm from '@/components/signals/EditSignalForm';
import { NotesEditModal } from '@/components/signals/NotesEditModal';
import { calculatePipsFromPrice } from '@/utils/pipCalculations';
import { tradingApiService } from '@/api/services/TradingApiService';
import type { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AdminSignalAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [viewingAlert, setViewingAlert] = useState<any>(null);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editingNotesAlert, setEditingNotesAlert] = useState<any>(null);
  const [userSignals, setUserSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'transitioning' | 'complete'>('loading');

  // Loading phase: 1s loading, then 0.5s transition
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoadingPhase('transitioning');
    }, 1000);
    
    const transitionTimer = setTimeout(() => {
      setLoadingPhase('complete');
    }, 1500);
    
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const isTransitioning = loadingPhase === 'transitioning';

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
    const { entry_price, stop_loss, tp1, tp2, tp3, tp4, tp5, tp_hits, tradermade_symbol, trade_type, close_reason } = signal;

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
        alert.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'pending') matchesStatus = alert.status === 'pending';
      else if (statusFilter === 'active') matchesStatus = alert.status === 'active' || alert.status === 'partially_profited';
      else if (statusFilter === 'closed') matchesStatus = alert.status === 'closed';
      
      return matchesSearch && matchesStatus;
    });
  }, [userSignals, searchTerm, statusFilter]);

  // Stats
  const pendingCount = userSignals.filter(s => s.status === 'pending').length;
  const activeCount = userSignals.filter(s => s.status === 'active' || s.status === 'partially_profited').length;
  const closedCount = userSignals.filter(s => s.status === 'closed').length;

  // Signal handlers
  const handleDeleteSignal = async (alertId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await tradingApiService.deleteAlert(alertId, user.id);
      if (!result.success) throw new Error(result.error || 'Failed to delete signal');
      
      toast({ title: "Signal Deleted", description: "Signal deleted successfully" });
      setDeleteConfirmId(null);
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
    
    try {
      const { data, error } = await supabase.rpc('close_trade_alert', {
        p_alert_id: alertId,
        p_user_id: user?.id,
        p_close_reason: 'manual',
        p_closing_price: null
      });
      
      if (error) throw error;
      
      const response = data as any;
      if (response && response.success === false) {
        throw new Error(response.error || 'Failed to close signal');
      }
      
      toast({
        title: "Success",
        description: signal?.status === 'pending' ? "Pending order cancelled" : "Signal closed"
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          label: 'Pending', 
          bg: 'bg-amber-50 dark:bg-amber-500/10', 
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-500/20',
          gradient: 'from-amber-500 to-orange-600'
        };
      case 'active':
      case 'partially_profited':
        return { 
          icon: Activity, 
          label: 'Active', 
          bg: 'bg-cyan-50 dark:bg-cyan-500/10', 
          text: 'text-cyan-600 dark:text-cyan-400',
          border: 'border-cyan-200 dark:border-cyan-500/20',
          gradient: 'from-cyan-500 to-blue-600'
        };
      case 'closed':
        return { 
          icon: CheckCircle, 
          label: 'Closed', 
          bg: 'bg-slate-50 dark:bg-slate-500/10', 
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-200 dark:border-slate-500/20',
          gradient: 'from-slate-500 to-slate-600'
        };
      default:
        return { 
          icon: Clock, 
          label: status, 
          bg: 'bg-slate-50 dark:bg-slate-500/10', 
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-200 dark:border-slate-500/20',
          gradient: 'from-slate-500 to-slate-600'
        };
    }
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  if (isLoadingSignals || loadingAnalytics || loadingPhase === 'loading') {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Signal className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">Loading Signals</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full pb-24 lg:pb-6 transition-all duration-500 ${
        isTransitioning ? 'blur-sm opacity-90' : 'blur-0 opacity-100'
      }`}
    >
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Signal className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">Trading Signals</h1>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                {filteredAlerts.length} of {userSignals.length} signals
                {hasActiveFilters && (
                  <span className="ml-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    filtered
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                hasActiveFilters 
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open('/dashboard/new-signal', '_blank')}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              onClick={fetchUserSignals}
              variant="outline"
              size="sm"
              className="h-10 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => window.open('/dashboard/new-signal', '_blank')}
              size="sm"
              className="h-10 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Signal
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-6">
          {/* Win Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl p-3 lg:p-4 border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Win Rate</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{analytics?.win_rate.toFixed(1) || 0}%</p>
              </div>
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500 opacity-60" />
            </div>
          </div>
          
          {/* Pips Gained */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 lg:p-4 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pips Gained</p>
                <p className="text-xl lg:text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">+{analytics?.total_pips_gained || 0}</p>
              </div>
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500 opacity-60" />
            </div>
          </div>
          
          {/* Pips Lost */}
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3 lg:p-4 border border-red-200 dark:border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Pips Lost</p>
                <p className="text-xl lg:text-2xl font-bold text-red-700 dark:text-red-300 mt-1">-{analytics?.total_pips_lost || 0}</p>
              </div>
              <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 opacity-60" />
            </div>
          </div>
          
          {/* Total Signals */}
          <div className="bg-slate-50 dark:bg-slate-500/10 rounded-xl p-3 lg:p-4 border border-slate-200 dark:border-slate-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-xl lg:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">{analytics?.total_signals || 0}</p>
              </div>
              <Signal className="w-5 h-5 lg:w-6 lg:h-6 text-slate-500 opacity-60" />
            </div>
          </div>
        </div>
        
        {/* Status Tabs - Mobile */}
        <div className="flex lg:hidden overflow-x-auto gap-2 mb-4 pb-1 -mx-1 px-1">
          {[
            { value: 'all', label: 'All', count: userSignals.length },
            { value: 'pending', label: 'Pending', count: pendingCount },
            { value: 'active', label: 'Active', count: activeCount },
            { value: 'closed', label: 'Closed', count: closedCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                statusFilter === tab.value
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
        
        {/* Desktop Search and Filters */}
        <div className="hidden lg:flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          
          {/* Status Tabs - Desktop */}
          <div className="flex items-center gap-2">
            {[
              { value: 'all', label: 'All', count: userSignals.length },
              { value: 'pending', label: 'Pending', count: pendingCount },
              { value: 'active', label: 'Active', count: activeCount },
              { value: 'closed', label: 'Closed', count: closedCount },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  statusFilter === tab.value
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
          
          {hasActiveFilters && (
            <Button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              variant="ghost"
              size="sm"
              className="h-10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Signals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-16 px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Signal className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No signals found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                {hasActiveFilters ? 'Try adjusting your filters.' : "You haven't created any trading signals yet."}
              </p>
              <Button
                onClick={() => window.open('/dashboard/new-signal', '_blank')}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Signal
              </Button>
            </motion.div>
          ) : (
            filteredAlerts.map((alert) => {
              const statusConfig = getStatusConfig(alert.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedCard === alert.id;
              const isBuy = alert.tradeType.includes('buy');
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group"
                >
                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="p-4 lg:p-5">
                        <div className="flex items-start justify-between gap-3">
                          {/* Asset Info */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${isBuy ? 'from-emerald-100 to-green-100 dark:from-emerald-500/20 dark:to-green-500/20' : 'from-red-100 to-rose-100 dark:from-red-500/20 dark:to-rose-500/20'} flex items-center justify-center flex-shrink-0`}>
                              {isBuy ? (
                                <ArrowUpRight className={`w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400`} />
                              ) : (
                                <ArrowDownRight className={`w-5 h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {alert.assetName}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                  {alert.tradermadeSymbol}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Trade Type */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isBuy 
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                                    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                }`}>
                                  {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {alert.tradeType}
                                </span>
                                {/* Status */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                                {/* TP Hits */}
                                {alert.tpHits?.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                    <Target className="w-3 h-3" />
                                    TP{Math.max(...alert.tpHits)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setViewingAlert(alert)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {alert.status !== 'closed' && (
                                <DropdownMenuItem onClick={() => handleCloseSignal(alert.id)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {alert.status === 'pending' ? 'Cancel Order' : 'Close Signal'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirmId(alert.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Price Grid */}
                        <div className="grid grid-cols-3 gap-3 mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <div className="text-center">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Entry</p>
                            <p className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{alert.entryPrice}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Stop Loss</p>
                            <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">{alert.stopLoss}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">TP1</p>
                            <p className="font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">{alert.tp1 || '—'}</p>
                          </div>
                        </div>
                        
                        {/* Expand Toggle */}
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : alert.id)}
                          className="flex items-center justify-center gap-1 w-full mt-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          {isExpanded ? 'Hide Details' : 'Show More'}
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                {/* All TPs */}
                                {(alert.tp2 || alert.tp3 || alert.tp4 || alert.tp5) && (
                                  <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Take Profit Levels</p>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[
                                        { label: 'TP2', value: alert.tp2, hit: alert.tpHits?.includes(2) },
                                        { label: 'TP3', value: alert.tp3, hit: alert.tpHits?.includes(3) },
                                        { label: 'TP4', value: alert.tp4, hit: alert.tpHits?.includes(4) },
                                        { label: 'TP5', value: alert.tp5, hit: alert.tpHits?.includes(5) },
                                      ].filter(tp => tp.value).map((tp) => (
                                        <div 
                                          key={tp.label}
                                          className={`p-2 rounded-lg text-center ${
                                            tp.hit 
                                              ? 'bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30' 
                                              : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                          }`}
                                        >
                                          <p className={`text-[10px] ${tp.hit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{tp.label}</p>
                                          <p className={`font-mono text-xs font-medium ${tp.hit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{tp.value}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {alert.notes && (
                                  <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Notes</p>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                      <p className="text-sm text-slate-700 dark:text-slate-300">{alert.notes}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Metadata */}
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    Updated {new Date(alert.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Quick Actions - Mobile */}
                      {alert.status !== 'closed' && (
                        <div className="lg:hidden flex border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setViewingAlert(alert)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors border-r border-slate-100 dark:border-slate-800"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleCloseSignal(alert.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            {alert.status === 'pending' ? 'Cancel' : 'Close'}
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Filter Sheet */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 gap-0 rounded-t-3xl rounded-b-none fixed bottom-0 top-auto translate-y-0">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          
          <DialogHeader className="px-6 pb-4">
            <DialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Filters
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-8 space-y-5">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by asset..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'active', label: 'Active' },
                  { value: 'closed', label: 'Closed' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(status.value)}
                    className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                      statusFilter === status.value
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  variant="outline"
                  className="flex-1 h-12 border-slate-200 dark:border-slate-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              Delete Signal
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
              Are you sure you want to delete this signal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline"
              onClick={() => setDeleteConfirmId(null)} 
              className="flex-1 border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => deleteConfirmId && handleDeleteSignal(deleteConfirmId)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Signal Modal */}
      <Dialog open={!!viewingAlert} onOpenChange={() => setViewingAlert(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center">
                <Signal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Signal Details
            </DialogTitle>
          </DialogHeader>
          
          {viewingAlert && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewingAlert.assetName}</h3>
                  <p className="text-sm text-slate-500 font-mono">{viewingAlert.tradermadeSymbol}</p>
                </div>
                <Badge className={`${viewingAlert.tradeType.includes('buy') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                  {viewingAlert.tradeType.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Entry Price</p>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{viewingAlert.entryPrice}</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                  <p className="text-xs text-red-500 mb-1">Stop Loss</p>
                  <p className="font-mono font-semibold text-red-600 dark:text-red-400">{viewingAlert.stopLoss}</p>
                </div>
              </div>

              {/* TPs */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Take Profit Levels</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const tpValue = viewingAlert[`tp${num}`];
                    const isHit = viewingAlert.tpHits?.includes(num);
                    return (
                      <div 
                        key={num}
                        className={`p-2 rounded-lg text-center ${
                          isHit 
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30' 
                            : tpValue 
                              ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                              : 'bg-slate-50/50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className={`text-[10px] ${isHit ? 'text-emerald-600' : 'text-slate-400'}`}>TP{num}</p>
                        <p className={`font-mono text-xs ${isHit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {tpValue || '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewingAlert.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Notes</p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{viewingAlert.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>Created {new Date(viewingAlert.createdAt).toLocaleString()}</span>
                <span>Updated {new Date(viewingAlert.updatedAt).toLocaleString()}</span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Signal</DialogTitle>
            <DialogDescription className="text-slate-500">Update your trading signal details</DialogDescription>
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
