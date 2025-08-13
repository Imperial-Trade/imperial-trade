
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  Plus, 
  BarChart3, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { useOptimizedTradingRealtime } from '@/hooks/useOptimizedTradingRealtime';
import { tradingApiService } from '@/api/services/TradingApiService';
import { adminAuditService } from '@/api/services/AdminAuditService';

interface AdminTradeSignalsTabProps {
  currentUser: any;
}

export function AdminTradeSignalsTab({ currentUser }: AdminTradeSignalsTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [signalStats, setSignalStats] = useState({
    totalSignals: 0,
    activeSignals: 0,
    closedSignals: 0,
    successRate: 0
  });

  const { 
    alerts, 
    isLoading, 
    error, 
    refreshAlerts 
  } = useOptimizedTrading(currentUser?.id || '', true);

  // Enable real-time updates
  useOptimizedTradingRealtime(currentUser?.id || '', true);

  useEffect(() => {
    if (alerts.length > 0) {
      calculateStats();
    }
  }, [alerts]);

  const calculateStats = () => {
    const total = alerts.length;
    const active = alerts.filter(alert => alert.status === 'active').length;
    const closed = alerts.filter(alert => alert.status === 'closed').length;
    const successful = alerts.filter(alert => 
      alert.status === 'closed' && alert.tpHits && alert.tpHits.length > 0
    ).length;
    
    setSignalStats({
      totalSignals: total,
      activeSignals: active,
      closedSignals: closed,
      successRate: closed > 0 ? Math.round((successful / closed) * 100) : 0
    });
  };

  const handleNewSignalSubmit = async (signalData: any) => {
    try {
      console.log('Creating new signal:', signalData);
      
      // Create the signal using the trading API service
      const result = await tradingApiService.createAlert({
        assetName: signalData.assetName,
        tradermadeSymbol: signalData.tradermadeSymbol,
        tradeType: signalData.tradeType,
        entryPrice: signalData.entryPrice,
        stopLoss: signalData.stopLoss,
        tp1: signalData.tp1,
        tp2: signalData.tp2,
        tp3: signalData.tp3,
        tp4: signalData.tp4,
        tp5: signalData.tp5,
        notes: signalData.notes
      }, currentUser?.id || '');

      if (result.success) {
        console.log('Signal created successfully:', result.data);
        
        // Log admin action
        if (currentUser) {
          await adminAuditService.logAdminAction(
            'create_trade_signal',
            currentUser.email || 'unknown',
            'trade_alert',
            result.data?.id || '',
            {
              assetName: signalData.assetName,
              tradeType: signalData.tradeType,
              entryPrice: signalData.entryPrice
            }
          );
        }

        // Refresh the trade alerts list
        await refreshAlerts();
        
        // Close the dialog
        setShowCreateDialog(false);
      } else {
        console.error('Failed to create signal:', result.error);
      }
    } catch (error) {
      console.error('Error creating signal:', error);
    }
  };

  const handleSignalStatusUpdate = async (alert: any, newStatus: string): Promise<void> => {
    try {
      const result = await tradingApiService.updateAlert(
        alert.id, 
        { status: newStatus as 'pending' | 'active' | 'closed' }, 
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        // Log admin action
        await adminAuditService.logAdminAction(
          'update_trade_signal',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { status: newStatus }
        );
        
        // Refresh the list
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const handleTakeProfitHit = async (alert: any, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string): Promise<void> => {
    try {      
      const result = await tradingApiService.updateAlert(
        alert.id,
        { 
          tpHits: newTPHits,
          closeReason: closeReason as any,
          status: shouldAutoClose ? 'closed' as const : alert.status
        },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'tp_hit',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { newTPHits, closeReason }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error handling TP hit:', error);
    }
  };

  const handleStopLossHit = async (alert: any, closeReason: string): Promise<void> => {
    try {
      const result = await tradingApiService.updateAlert(
        alert.id,
        { 
          closeReason: closeReason as any,
          status: 'closed' as const
        },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'stop_loss_hit',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { reason: closeReason }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error handling stop loss:', error);
    }
  };

  const handleOrderActivation = async (alert: any): Promise<void> => {
    try {
      const result = await tradingApiService.updateAlert(
        alert.id,
        { status: 'active' as const },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'order_activated',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { previousStatus: alert.status }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error activating order:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-effect border-default">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Total Signals</p>
                <p className="text-2xl font-bold text-primary">{signalStats.totalSignals}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Active Signals</p>
                <p className="text-2xl font-bold text-primary">{signalStats.activeSignals}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Closed Signals</p>
                <p className="text-2xl font-bold text-primary">{signalStats.closedSignals}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-primary">{signalStats.successRate}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trade Signals Management
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 ml-2">
                Admin
              </Badge>
            </CardTitle>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-accent-green hover:bg-accent-green/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Signal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-3 bg-surface">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  All Signals
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Closed
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="p-6">
              <div className="grid gap-4">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <TradeAlertCard
                      key={alert.id}
                      alert={{
                        ...alert,
                        asset_name: alert.assetName,
                        tradermade_symbol: alert.tradermadeSymbol,
                        trade_type: alert.tradeType,
                        entry_price: alert.entryPrice,
                        stop_loss: alert.stopLoss,
                        tp_hits: alert.tpHits,
                        close_reason: alert.closeReason,
                        created_date: alert.createdAt,
                        updated_date: alert.updatedAt
                      }}
                      onStatusUpdate={handleSignalStatusUpdate}
                      onTakeProfitHit={handleTakeProfitHit}
                      onStopLossHit={handleStopLossHit}
                      onOrderActivation={handleOrderActivation}
                      isAdmin={true}
                      isCreator={true}
                      connectionStatus="connected"
                      priceSource="admin"
                      isRecentClosure={false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Trade Signals
                    </h3>
                    <p className="text-secondary">
                      Create your first trade signal to get started.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="active" className="p-6">
              <div className="grid gap-4">
                {alerts.filter(alert => alert.status === 'active').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={{
                      ...alert,
                      asset_name: alert.assetName,
                       tradermade_symbol: alert.tradermadeSymbol,
                      trade_type: alert.tradeType,
                      entry_price: alert.entryPrice,
                      stop_loss: alert.stopLoss,
                      tp_hits: alert.tpHits,
                      close_reason: alert.closeReason,
                      created_date: alert.createdAt,
                      updated_date: alert.updatedAt
                    }}
                    onStatusUpdate={handleSignalStatusUpdate}
                    onTakeProfitHit={handleTakeProfitHit}
                    onStopLossHit={handleStopLossHit}
                    onOrderActivation={handleOrderActivation}
                    isAdmin={true}
                    isCreator={true}
                    connectionStatus="connected"
                    priceSource="admin"
                    isRecentClosure={false}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="closed" className="p-6">
              <div className="grid gap-4">
                {alerts.filter(alert => alert.status === 'closed').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={{
                      ...alert,
                      asset_name: alert.assetName,
                      tradermade_symbol: alert.tradermadeSymbol,
                      trade_type: alert.tradeType,
                      entry_price: alert.entryPrice,
                      stop_loss: alert.stopLoss,
                      tp_hits: alert.tpHits,
                      close_reason: alert.closeReason,
                      created_date: alert.createdAt,
                      updated_date: alert.updatedAt
                    }}
                    onStatusUpdate={handleSignalStatusUpdate}
                    onTakeProfitHit={handleTakeProfitHit}
                    onStopLossHit={handleStopLossHit}
                    onOrderActivation={handleOrderActivation}
                    isAdmin={true}
                    isCreator={true}
                    connectionStatus="connected"
                    priceSource="admin"
                    isRecentClosure={false}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Signal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Create New Trade Signal
            </DialogTitle>
          </DialogHeader>
          <OptimizedNewAlertForm
            onSubmit={handleNewSignalSubmit}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
