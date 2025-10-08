import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Search, TrendingUp, TrendingDown, Users, Eye, Edit, Trash2, BarChart3, Signal, CheckCircle, Clock, AlertCircle, Shield, XCircle } from 'lucide-react';
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
  active_signals: number;
  closed_signals: number;
  win_rate: number;
  total_pips_gained: number;
  total_pips_lost: number;
  net_pips: number;
  recent_activity: number;
}
export function AdminSignalManagement() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    refreshAlerts
  } = useOptimizedTrading(user?.id || '', false);
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState<AdminSignalAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [viewingAlert, setViewingAlert] = useState<any>(null);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editingNotesAlert, setEditingNotesAlert] = useState<any>(null);
  const [userSignals, setUserSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  // Fetch user's own signals directly from database (no time filters)
  const fetchUserSignals = async () => {
    if (!user?.id) {
      console.warn('No user ID available for fetchUserSignals');
      setIsLoadingSignals(false);
      return;
    }

    try {
      setIsLoadingSignals(true);
      console.log('Fetching signals for user:', user.id);
      
      // First fetch the signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (signalsError) {
        console.error('Supabase query error:', signalsError);
        throw signalsError;
      }

      // Then fetch profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, user_type, access_level')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Profile fetch error:', profileError);
      }

      const data = signalsData;

      console.log('Fetched signals:', data?.length || 0);

      // Map to expected format with profile data
      const mappedSignals = (data || []).map((signal: any) => ({
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
      
      // Enhanced error message
      const errorMsg = error?.message || 'Failed to load your signals';
      const isRLSError = errorMsg.includes('policy') || errorMsg.includes('permission');
      
      toast({
        title: "Error Loading Signals",
        description: isRLSError 
          ? "Permission denied. Please contact support."
          : errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoadingSignals(false);
    }
  };

  // Fetch signals on mount and when user changes
  useEffect(() => {
    fetchUserSignals();
  }, [user?.id]);

  // Helper function to calculate pips for a signal
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

  // Extract analytics fetching as standalone function for reusability
  const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        if (!user?.id) {
          setLoadingAnalytics(false);
          return;
        }

        // Get signal statistics with all needed fields
        const {
          data: signalStats,
          error: signalError
        } = await supabase
          .from('trade_alerts')
          .select('status, user_id, tp_hits, created_at, entry_price, stop_loss, tp1, tp2, tp3, tp4, tp5, tradermade_symbol, trade_type, close_reason')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (signalError) throw signalError;

        const totalSignals = signalStats?.length || 0;
        const activeSignals = signalStats?.filter(s => 
          s.status === 'active' || s.status === 'partially_profited'
        ).length || 0;
        
        const closedSignals = signalStats?.filter(s => s.status === 'closed') || [];
        const closedSignalsCount = closedSignals.length;
        
        // Calculate win rate based on TP1+ hits
        const winningSignals = closedSignals.filter(s => 
          s.tp_hits?.length > 0 && s.tp_hits.some((hit: number) => hit >= 1)
        ).length;
        const winRate = closedSignalsCount > 0 ? (winningSignals / closedSignalsCount) * 100 : 0;
        
        // Calculate total pips gained and lost
        let totalPipsGained = 0;
        let totalPipsLost = 0;
        
        closedSignals.forEach(signal => {
          const { gained, lost } = calculateSignalPips(signal);
          totalPipsGained += gained;
          totalPipsLost += lost;
        });

        const netPips = totalPipsGained - totalPipsLost;

        // Recent activity (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentActivity = signalStats?.filter(s => new Date(s.created_at) > yesterday).length || 0;

        setAnalytics({
          total_signals: totalSignals,
          active_signals: activeSignals,
          closed_signals: closedSignalsCount,
          win_rate: winRate,
          total_pips_gained: Math.round(totalPipsGained * 10) / 10,
          total_pips_lost: Math.round(totalPipsLost * 10) / 10,
          net_pips: Math.round(netPips * 10) / 10,
          recent_activity: recentActivity
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
  
  // Fetch admin analytics on mount
  useEffect(() => {
    fetchAnalytics();
  }, [user?.id]);

  // Filter alerts based on search - using userSignals (direct DB fetch)
  const filteredAlerts = useMemo(() => {
    return userSignals.filter(alert => {
      const matchesSearch = alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) || alert.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || alert.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [userSignals, searchTerm]);
  const getStatusBadge = (status: string) => {
    const variants = {
      active: {
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: Clock
      },
      closed: {
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        icon: CheckCircle
      },
      pending: {
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        icon: Clock
      }
    };
    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    return <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>;
  };
  const getPerformanceBadge = (alert: any) => {
    if (alert.status !== 'closed') return null;
    const isProfit = alert.tpHits?.length > 0;
    return <Badge className={isProfit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
        {isProfit ? 'TP REACHED' : 'STOP LOSS'}
      </Badge>;
  };
  /**
   * ✅ SECURITY FIX: Admin Delete Signal via Validated API Service
   * Uses tradingApiService.deleteAlert() for proper authorization and audit logging
   */
  const handleDeleteSignal = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this signal? This action cannot be undone.') || !user?.id) {
      return;
    }
    
    try {
      const result = await tradingApiService.deleteAlert(alertId, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete signal');
      }
      
      toast({
        title: "Success",
        description: "Signal deleted successfully"
      });
      
      // Refresh signals, analytics, and global alerts
      await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
    } catch (error) {
      console.error('❌ Error deleting signal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete signal",
        variant: "destructive"
      });
    }
  };
  /**
   * ✅ SECURITY FIX (BUG #7): Admin Edit Signal via Validated API Service
   * Replaces direct Supabase bypass with tradingApiService.updateAlert()
   * - Uses UpdateTradeAlertDto for type safety
   * - Applies Zod validation via API service
   * - Includes authentication check
   * - Removes manual updated_at injection (handled by database)
   */
  const handleEditSignal = async (updateData: any) => {
    if (!editingAlert || !user?.id) return;
    
    try {
      // Build validated DTO
      const updateDto: UpdateTradeAlertDto = {
        status: updateData.status,
        notes: updateData.notes,
        tpHits: updateData.tpHits,
        closeReason: updateData.closeReason
      };

      // Use API service with full validation pipeline
      const result = await tradingApiService.updateAlert(
        editingAlert.id,
        updateDto,
        user.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update signal');
      }

      toast({
        title: "Success",
        description: "Signal updated successfully"
      });
      
      setEditingAlert(null);
      
      // Refresh signals, analytics, and global alerts
      await Promise.all([fetchUserSignals(), fetchAnalytics(), refreshAlerts()]);
    } catch (error) {
      console.error('❌ Error updating signal:', error);
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
      // ============================================
      // PHASE 1: APPLY SANITIZATION TO ADMIN PANEL
      // ============================================
      const updatePayload = sanitizeDatabasePayload({
        status: 'closed' as const,
        close_reason: 'manual' as const,
        updated_at: new Date().toISOString()
      });
      
      console.log('🔧 [AdminSignalManagement] Sanitized close payload:', updatePayload);
      
      const { error } = await supabase
        .from('trade_alerts')
        .update(updatePayload)
        .eq('id', alertId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: signal?.status === 'pending' 
          ? "Pending order cancelled successfully"
          : "Signal closed successfully"
      });
      
      // Refresh signals, analytics, and global alerts
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
  const renderSignalCard = (alert: any, index: number) => <motion.div key={alert.id} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} transition={{
    delay: index * 0.05
  }}>
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{alert.assetName}</h3>
                  <Badge variant="outline" className="text-xs">
                    {alert.tradermadeSymbol}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(alert.status)}
                  {getPerformanceBadge(alert)}
                  <Badge className={alert.tradeType.includes('buy') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                    {alert.tradeType === 'buy' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {alert.tradeType.toUpperCase()}
                  </Badge>
                  {alert.creator && <Badge variant="secondary" className="text-xs">
                      by {alert.creator.display_name || 'Unknown'}
                    </Badge>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Entry Price</p>
                <p className="font-semibold">${alert.entryPrice}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Stop Loss</p>
                <p className="font-semibold text-red-400">${alert.stopLoss}</p>
              </div>
              {alert.tp1 && <div className="text-right">
                  <p className="text-sm text-muted-foreground">TP1</p>
                  <p className="font-semibold text-green-400">${alert.tp1}</p>
                </div>}
            </div>
          </div>

          {alert.notes && <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{alert.notes}</p>
            </div>}

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated {new Date(alert.updatedAt).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* PENDING SIGNALS */}
              {alert.status === 'pending' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditingNotesAlert(alert)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Notes
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setViewingAlert(alert)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCloseSignal(alert.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <XCircle className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                </>
              )}

              {/* ACTIVE/PARTIALLY_PROFITED SIGNALS */}
              {(alert.status === 'active' || alert.status === 'partially_profited') && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditingNotesAlert(alert)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Notes
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setViewingAlert(alert)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCloseSignal(alert.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <XCircle className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                </>
              )}

              {/* CLOSED SIGNALS */}
              {alert.status === 'closed' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setViewingAlert(alert)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSignal(alert.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>;
  if (isLoadingSignals || loadingAnalytics) {
    return <div className="flex items-center justify-center h-64">
        <motion.div animate={{
        rotate: 360
      }} transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            
            
          </div>
          <Button onClick={() => window.open('/dashboard/new-signal', '_blank')} className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105">
            <Plus className="w-4 h-4 mr-2" />
            Create Signal
          </Button>
        </div>

        {/* Analytics Cards - now showing admin's own signals with premium design */}
        {analytics && <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">My Signals</p>
                      <p className="text-2xl font-bold">{analytics.total_signals}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Signal className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-green-400">{analytics.active_signals}</p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <Clock className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="text-2xl font-bold text-blue-400">{analytics.closed_signals}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold text-purple-400">{(analytics.win_rate ?? 0).toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">TP1+ Signals</p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pips Gained</p>
                      <p className="text-2xl font-bold text-emerald-400">+{(analytics.total_pips_gained ?? 0).toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-full">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/10 border-rose-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pips Lost</p>
                      <p className="text-2xl font-bold text-rose-400">-{(analytics.total_pips_lost ?? 0).toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-rose-500/20 rounded-full">
                      <TrendingDown className="w-5 h-5 text-rose-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Pips</p>
                      <p className={`text-2xl font-bold ${(analytics.net_pips ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(analytics.net_pips ?? 0) >= 0 ? '+' : ''}{(analytics.net_pips ?? 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-cyan-500/20 rounded-full">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }}>
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">24h Activity</p>
                      <p className="text-2xl font-bold text-orange-400">{analytics.recent_activity}</p>
                    </div>
                    <div className="p-3 bg-orange-500/20 rounded-full">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>}
      </motion.div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search your signals by asset or symbol..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={() => fetchUserSignals()} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signals Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            My Signals ({filteredAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filteredAlerts.filter(a => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({filteredAlerts.filter(a => a.status === 'active' || a.status === 'partially_profited').length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({filteredAlerts.filter(a => a.status === 'closed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.map((alert, index) => renderSignalCard(alert, index))}
          </AnimatePresence>

          {filteredAlerts.length === 0 && <Card>
              <CardContent className="p-8 text-center">
                <Signal className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Signals Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No signals match your search criteria.' : 'You haven\'t created any trading signals yet.'}
                </p>
                <Button onClick={() => window.open('/dashboard/new-signal', '_blank')} className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Signal
                </Button>
              </CardContent>
            </Card>}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.filter(alert => alert.status === 'pending').map((alert, index) => renderSignalCard(alert, index))}
          </AnimatePresence>

          {filteredAlerts.filter(alert => alert.status === 'pending').length === 0 && <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Pending Signals</h3>
                <p className="text-muted-foreground mb-4">You don't have any pending limit orders at the moment.</p>
                <Button onClick={() => window.open('/dashboard/new-signal', '_blank')} className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Signal
                </Button>
              </CardContent>
            </Card>}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.filter(alert => alert.status === 'active' || alert.status === 'partially_profited').map((alert, index) => renderSignalCard(alert, index))}
          </AnimatePresence>

          {filteredAlerts.filter(alert => alert.status === 'active' || alert.status === 'partially_profited').length === 0 && <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Signals</h3>
                <p className="text-muted-foreground mb-4">You don't have any active trading signals at the moment.</p>
                <Button onClick={() => window.open('/dashboard/new-signal', '_blank')} className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Signal
                </Button>
              </CardContent>
            </Card>}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.filter(alert => alert.status === 'closed').map((alert, index) => renderSignalCard(alert, index))}
          </AnimatePresence>

          {filteredAlerts.filter(alert => alert.status === 'closed').length === 0 && <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Closed Signals</h3>
                <p className="text-muted-foreground mb-4">You don't have any closed trading signals yet.</p>
                <Button onClick={() => window.open('/dashboard/new-signal', '_blank')} className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-600 hover:to-amber-700 text-white transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Signal
                </Button>
              </CardContent>
            </Card>}
        </TabsContent>
      </Tabs>

      {/* View Signal Modal */}
      <Dialog open={!!viewingAlert} onOpenChange={() => setViewingAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signal Details</DialogTitle>
            <DialogDescription>
              Comprehensive view of your trading signal
            </DialogDescription>
          </DialogHeader>
          
          {viewingAlert && <div className="space-y-6">
              {/* Signal Header */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{viewingAlert.assetName}</h3>
                  {getStatusBadge(viewingAlert.status)}
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

              {/* Take Profit Levels */}
              {(viewingAlert.tp1 || viewingAlert.tp2 || viewingAlert.tp3 || viewingAlert.tp4 || viewingAlert.tp5) && <div>
                  <h4 className="font-semibold mb-3">Take Profit Levels</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map(tpNumber => {
                const tpValue = viewingAlert[`tp${tpNumber}`];
                if (!tpValue) return null;
                const isHit = viewingAlert.tpHits?.includes(tpNumber);
                return <div key={tpNumber} className={`p-3 rounded-lg border ${isHit ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-muted/50 border-border'}`}>
                          <p className="text-xs font-medium">TP{tpNumber}</p>
                          <p className="font-mono">${tpValue}</p>
                          {isHit && <CheckCircle className="w-3 h-3 mt-1" />}
                        </div>;
              })}
                  </div>
                </div>}

              {/* Performance */}
              {viewingAlert.status === 'closed' && <div>
                  <h4 className="font-semibold mb-3">Performance</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    {getPerformanceBadge(viewingAlert)}
                    {viewingAlert.closeReason && <p className="text-sm text-muted-foreground mt-2">
                        Close Reason: {viewingAlert.closeReason.replace('_', ' ').toUpperCase()}
                      </p>}
                  </div>
                </div>}

              {/* Notes */}
              {viewingAlert.notes && <div>
                  <h4 className="font-semibold mb-3">Notes</h4>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">{viewingAlert.notes}</p>
                  </div>
                </div>}

              {/* Timestamps */}
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
            </div>}
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
            <DialogDescription>
              Update your trading signal details and status
            </DialogDescription>
          </DialogHeader>
          
          {editingAlert && <EditSignalForm alert={editingAlert} onSubmit={handleEditSignal} onCancel={() => setEditingAlert(null)} />}
        </DialogContent>
      </Dialog>
    </div>;
}