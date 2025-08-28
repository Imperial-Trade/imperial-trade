import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { TradeAlertData } from '@/components/signals/TradeAlertData';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { useAuth } from '@/contexts/AuthContext';
import { createTpUpdateDto } from '@/utils/tradingUtils';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export default function AdminTradeSignalsTab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

  // Get all alerts (admin can see all)
  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts
  } = useOptimizedTrading(user?.id || '', true);

  const filteredAlerts = allAlerts.filter(alert => {
    const matchesSearch = alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesType = typeFilter === 'all' || alert.tradeType.includes(typeFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeAlerts = filteredAlerts.filter(alert => alert.status === 'active' || alert.status === 'pending');
  const closedAlerts = filteredAlerts.filter(alert => alert.status === 'closed');

  const totalAlerts = allAlerts.length;
  const activeCount = allAlerts.filter(a => a.status === 'active').length;
  const closedCount = allAlerts.filter(a => a.status === 'closed').length;
  const pendingCount = allAlerts.filter(a => a.status === 'pending').length;

  // Convert alert data to TradeAlertData format
  const convertToTradeAlertData = (alert: any): TradeAlertData => ({
    id: alert.id,
    asset_name: alert.assetName,
    tradermade_symbol: alert.tradermadeSymbol,
    trade_type: alert.tradeType,
    entry_price: alert.entryPrice,
    stop_loss: alert.stopLoss,
    status: alert.status,
    tp1: alert.tp1,
    tp2: alert.tp2,
    tp3: alert.tp3,
    tp4: alert.tp4,
    tp5: alert.tp5,
    tp_hits: alert.tpHits,
    close_reason: alert.closeReason,
    notes: alert.notes,
    created_date: alert.createdAt,
    updated_date: alert.updatedAt,
    creator: alert.creator
  });

  // Enhanced TP hit handler with auto-closure logic
  const handleTakeProfitHit = async (alert: TradeAlertData, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      console.log(`🎯 Admin processing TP hits for alert ${alert.id}:`, newTPHits);
      
      // Convert to domain entity for auto-closure logic
      const alertEntity = {
        id: alert.id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type,
        entryPrice: alert.entry_price,
        stopLoss: alert.stop_loss,
        userId: alert.creator?.id || '',
        status: alert.status,
        tp1: alert.tp1,
        tp2: alert.tp2,
        tp3: alert.tp3,
        tp4: alert.tp4,
        tp5: alert.tp5,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: alert.close_reason,
        createdAt: new Date(alert.created_date),
        updatedAt: new Date(alert.updated_date)
      };

      // Use the auto-closure utility
      const updateDto = createTpUpdateDto(
        alertEntity, 
        newTPHits, 
        shouldAutoClose, 
        closeReason
      );

      console.log('🚀 ADMIN CRITICAL TP Update:', {
        alertId: alert.id,
        assetName: alert.asset_name,
        newTPHits,
        updateDto,
        willAutoClose: updateDto.status === 'closed'
      });

      await updateAlert(alert.id, updateDto);
      
    } catch (err) {
      console.error("❌ Admin failed to update TP hits:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    if (updateInProgress.has(alert.id)) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus as any,
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      await updateAlert(alert.id, updateDto);
    } catch (err) {
      console.error("Admin failed to update status:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  const handleStopLossHit = async (alert: TradeAlertData, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: 'closed',
        closeReason: closeReason as any
      };
      await updateAlert(alert.id, updateDto);
    } catch (err) {
      console.error("Admin failed to update stop loss:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  const handleOrderActivation = async (alert: TradeAlertData) => {
    if (updateInProgress.has(alert.id)) return;

    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: 'active'
      };
      await updateAlert(alert.id, updateDto);
    } catch (err) {
      console.error("Admin failed to activate order:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading Signals</h3>
        <p className="text-sm">{error}</p>
        <Button onClick={refreshAlerts} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{closedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by asset name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="partially_profited">Partially Profited</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buy">Buy Orders</SelectItem>
            <SelectItem value="sell">Sell Orders</SelectItem>
            <SelectItem value="limit">Limit Orders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Signals Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Signals ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed Signals ({closedAlerts.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeAlerts.map(alert => (
                <TradeAlertCard
                  key={alert.id}
                  alert={convertToTradeAlertData(alert)}
                  onStatusUpdate={handleStatusUpdate}
                  onTakeProfitHit={handleTakeProfitHit}
                  onStopLossHit={handleStopLossHit}
                  onOrderActivation={handleOrderActivation}
                  isAdmin={true}
                  isCreator={true}
                  creator={alert.creator}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Active Signals</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No signals match your current filters.' 
                  : 'No active signals at the moment.'}
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          {closedAlerts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {closedAlerts.map(alert => (
                <TradeAlertCard
                  key={alert.id}
                  alert={convertToTradeAlertData(alert)}
                  onStatusUpdate={handleStatusUpdate}
                  onTakeProfitHit={handleTakeProfitHit}
                  onStopLossHit={handleStopLossHit}
                  onOrderActivation={handleOrderActivation}
                  isAdmin={true}
                  isCreator={true}
                  creator={alert.creator}
                  isRecentClosure={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Closed Signals</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No signals match your current filters.' 
                  : 'No closed signals yet.'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
