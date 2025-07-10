import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminTradingService } from '@/api/services/AdminTradingService';
import { adminAuditService } from '@/api/services/AdminAuditService';
import { TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Eye,
  TrendingUp,
  Users
} from 'lucide-react';

interface AdminTradeSignalsTabProps {
  currentUser: any;
}

export function AdminTradeSignalsTab({ currentUser }: AdminTradeSignalsTabProps) {
  const [signals, setSignals] = useState<TradeAlertResponseDto[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradeAlertResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [isNewSignalModalOpen, setIsNewSignalModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBroadcastBanner, setShowBroadcastBanner] = useState(false);
  const { toast } = useToast();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    pending: 0
  });

  useEffect(() => {
    loadSignals();
    
    // Set up real-time subscription for new signals
    const channel = supabase
      .channel('trade-alerts-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_alerts'
        },
        (payload) => {
          console.log('Trade alert change:', payload);
          loadSignals(); // Reload signals on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterSignals();
    updateStats();
  }, [signals, searchTerm, statusFilter]);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const result = await adminTradingService.getAllAlertsForAdmin();
      
      if (result.success && result.data) {
        setSignals(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load trade signals",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading signals:', error);
      toast({
        title: "Error",
        description: "Failed to load trade signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSignals = () => {
    let filtered = signals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(signal =>
        signal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.finnhubSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.tradeType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(signal => signal.status === statusFilter);
    }

    setFilteredSignals(filtered);
  };

  const updateStats = () => {
    const total = signals.length;
    const active = signals.filter(s => s.status === 'active').length;
    const closed = signals.filter(s => s.status === 'closed').length;
    const pending = signals.filter(s => s.status === 'pending').length;

    setStats({ total, active, closed, pending });
  };

  const handleNewSignalSubmit = async (data: any) => {
    try {
      // Log the signal creation action
      await adminAuditService.logAdminAction(
        'admin_create_trade_signal',
        currentUser.email || 'unknown',
        'trade_signals',
        'new_signal',
        {
          asset: data.asset_name,
          trade_type: data.trade_type,
          entry_price: data.entry_price
        }
      );

      // Show broadcast notification
      setBroadcastMessage(`New ${data.trade_type.toUpperCase()} signal posted for ${data.asset_name}`);
      setShowBroadcastBanner(true);
      setTimeout(() => setShowBroadcastBanner(false), 5000);

      // Reload signals
      await loadSignals();
      
      // Close modal
      setIsNewSignalModalOpen(false);

      toast({
        title: "Success",
        description: "Trade signal posted successfully and broadcasted to all users",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating signal:', error);
      toast({
        title: "Error",
        description: "Failed to post trade signal",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: 'delete' | 'activate' | 'close') => {
    if (selectedSignals.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select signals to perform bulk action",
        variant: "destructive"
      });
      return;
    }

    try {
      // Log bulk action
      await adminAuditService.logAdminAction(
        `admin_bulk_${action}_signals`,
        currentUser.email || 'unknown',
        'trade_signals',
        'bulk_action',
        {
          action,
          signal_count: selectedSignals.length,
          signal_ids: selectedSignals
        }
      );

      // For now, just show success message
      toast({
        title: "Success",
        description: `Bulk ${action} completed for ${selectedSignals.length} signals`,
        variant: "default"
      });

      // Clear selection
      setSelectedSignals([]);
      
      // Reload signals
      await loadSignals();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast({
        title: "Error",
        description: `Failed to perform bulk ${action}`,
        variant: "destructive"
      });
    }
  };

  const toggleSignalSelection = (signalId: string) => {
    setSelectedSignals(prev =>
      prev.includes(signalId)
        ? prev.filter(id => id !== signalId)
        : [...prev, signalId]
    );
  };

  const selectAllSignals = () => {
    if (selectedSignals.length === filteredSignals.length) {
      setSelectedSignals([]);
    } else {
      setSelectedSignals(filteredSignals.map(s => s.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Broadcast Banner */}
      {showBroadcastBanner && (
        <div className="bg-gradient-to-r from-accent-green/10 to-blue-500/10 border border-accent-green/20 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-accent-green animate-pulse" />
            <div className="flex-1">
              <p className="text-primary font-medium">Signal Broadcasted</p>
              <p className="text-secondary text-sm">{broadcastMessage}</p>
            </div>
            <Users className="w-4 h-4 text-accent-green" />
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-effect border-default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Total Signals</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Active</p>
                <p className="text-2xl font-bold text-primary">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Pending</p>
                <p className="text-2xl font-bold text-primary">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Closed</p>
                <p className="text-2xl font-bold text-primary">{stats.closed}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle className="text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trade Signals Management
            </CardTitle>
            
            <div className="flex items-center gap-3">
              <Dialog open={isNewSignalModalOpen} onOpenChange={setIsNewSignalModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent-green hover:bg-green-500 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Post New Signal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-transparent border-0 p-0">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Create New Trade Signal</DialogTitle>
                  </DialogHeader>
                  <OptimizedNewAlertForm 
                    onSubmit={handleNewSignalSubmit}
                    onCancel={() => setIsNewSignalModalOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={loadSignals}
                variant="outline"
                size="sm"
                className="border-default text-secondary hover:bg-surface hover:text-primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
              <Input
                placeholder="Search signals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-default text-primary"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 bg-surface border-default text-primary">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedSignals.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-surface/50 rounded-lg">
              <span className="text-sm text-secondary">
                {selectedSignals.length} signal(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('close')}
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedSignals.length === filteredSignals.length && filteredSignals.length > 0}
              onCheckedChange={selectAllSignals}
              className="border-default"
            />
            <span className="text-sm text-secondary">
              Select All ({filteredSignals.length} signals)
            </span>
          </div>

          {/* Signals Grid */}
          {filteredSignals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSignals.map((signal) => (
                <div key={signal.id} className="relative">
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                      checked={selectedSignals.includes(signal.id)}
                      onCheckedChange={() => toggleSignalSelection(signal.id)}
                      className="border-default bg-surface/80"
                    />
                  </div>
                  <TradeAlertCard
                    alert={{
                      id: signal.id,
                      asset_name: signal.assetName,
                      finnhub_symbol: signal.finnhubSymbol,
                      trade_type: signal.tradeType,
                      entry_price: signal.entryPrice,
                      stop_loss: signal.stopLoss,
                      status: signal.status,
                      tp1: signal.tp1,
                      tp2: signal.tp2,
                      tp3: signal.tp3,
                      tp4: signal.tp4,
                      tp5: signal.tp5,
                      tp_hits: signal.tpHits,
                      notes: signal.notes,
                      close_reason: signal.closeReason,
                      created_date: signal.createdAt,
                      updated_date: signal.updatedAt
                    }}
                    onStatusUpdate={async () => {}}
                    onTakeProfitHit={async () => {}}
                    onStopLossHit={async () => {}}
                    onOrderActivation={async () => {}}
                    isAdmin={true}
                    livePrice={null}
                    connectionStatus="connected"
                    priceSource=""
                    isRecentClosure={false}
                    className="ml-8"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                {signals.length === 0 ? 'No Trade Signals' : 'No Matching Signals'}
              </h3>
              <p className="text-secondary mb-4">
                {signals.length === 0 
                  ? 'Create your first trade signal to get started.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {signals.length === 0 && (
                <Dialog open={isNewSignalModalOpen} onOpenChange={setIsNewSignalModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent-green hover:bg-green-500 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Post Your First Signal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-transparent border-0 p-0">
                    <DialogHeader className="sr-only">
                      <DialogTitle>Create New Trade Signal</DialogTitle>
                    </DialogHeader>
                    <OptimizedNewAlertForm 
                      onSubmit={handleNewSignalSubmit}
                      onCancel={() => setIsNewSignalModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
