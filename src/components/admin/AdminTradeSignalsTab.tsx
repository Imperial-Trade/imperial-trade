import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Activity, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { tradingApiService } from '@/api/services/TradingApiService';
import { useToast } from '@/hooks/use-toast';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { adminAuditService } from '@/api/services/AdminAuditService';

export const AdminTradeSignalsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [signalStats, setSignalStats] = useState({
    totalSignals: 0,
    activeSignals: 0,
    closedSignals: 0,
    successRate: 0
  });

  const refreshAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await tradingApiService.getAllPublicAlertsWithProfiles();
      if (result.success && result.data) {
        setAlerts(result.data);
        updateSignalStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to fetch trade alerts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  const updateSignalStats = (alertsList: TradeAlertWithProfile[]) => {
    const total = alertsList.length;
    const active = alertsList.filter(alert => alert.status === 'active').length;
    const closed = alertsList.filter(alert => alert.status === 'closed').length;
    const successful = alertsList.filter(alert => 
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

        await refreshAlerts();
        setShowCreateDialog(false);
        toast({ title: 'Success', description: 'Signal created successfully' });
      } else {
        console.error('Failed to create signal:', result.error);
        toast({ title: 'Error', description: 'Failed to create signal' });
      }
    } catch (error) {
      console.error('Error creating signal:', error);
      toast({ title: 'Error', description: 'Error creating signal' });
    }
  };

  const handleSignalStatusUpdate = async (alert: TradeAlertWithProfile, newStatus: string) => {
    try {
      const result = await tradingApiService.updateAlert(
        alert.id,
        { status: newStatus as any },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'update_trade_signal',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { status: newStatus }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const handleTakeProfitHit = async (alert: TradeAlertWithProfile, tpLevel: number): Promise<void> => {
    try {      
      const result = await tradingApiService.updateAlert(
        alert.id,
        { 
          tpHits: [tpLevel],
          status: alert.status
        },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'tp_hit',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { tpLevel }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error handling TP hit:', error);
    }
  };

  const handleStopLossHit = async (alert: TradeAlertWithProfile): Promise<void> => {
    try {
      const result = await tradingApiService.updateAlert(
        alert.id,
        { 
          status: 'closed' as const,
          closeReason: 'stop_loss' as any
        },
        currentUser?.id || ''
      );
      
      if (result.success && currentUser) {
        await adminAuditService.logAdminAction(
          'stop_loss_hit',
          currentUser.email || 'unknown',
          'trade_alert',
          alert.id,
          { closeReason: 'stop_loss' }
        );
        
        await refreshAlerts();
      }
    } catch (error) {
      console.error('Error handling stop loss hit:', error);
    }
  };

  const handleOrderActivation = async (): Promise<void> => {
    try {
      console.log('Order activation requested from admin panel');
      await refreshAlerts();
    } catch (error) {
      console.error('Error handling order activation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refreshAlerts} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Trade Signals Management</h2>
          <p className="text-secondary">Create and manage trading signals for all users</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Signal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Active Signals */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary">Active Signals ({signalStats.activeSignals})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.filter(alert => alert.status === 'active').length > 0 ? (
              <div className="grid gap-4">
                {alerts.filter(alert => alert.status === 'active').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={alert}
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
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Active Signals
                </h3>
                <p className="text-secondary">
                  Create your first trading signal to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Signals */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary">Pending Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.filter(alert => alert.status === 'pending').length > 0 ? (
              <div className="grid gap-4">
                {alerts.filter(alert => alert.status === 'pending').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={alert}
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
            ) : (
              <p className="text-secondary text-center py-4">No pending signals</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Closed Signals */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary">Recent Closed Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.filter(alert => alert.status === 'closed').slice(0, 5).length > 0 ? (
              <div className="grid gap-4">
                {alerts.filter(alert => alert.status === 'closed').slice(0, 5).map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={alert}
                    onStatusUpdate={handleSignalStatusUpdate}
                    onTakeProfitHit={handleTakeProfitHit}
                    onStopLossHit={handleStopLossHit}
                    onOrderActivation={handleOrderActivation}
                    isAdmin={true}
                    isCreator={true}
                    connectionStatus="connected"
                    priceSource="admin"
                    isRecentClosure={true}
                  />
                ))}
              </div>
            ) : (
              <p className="text-secondary text-center py-4">No closed signals</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Signal Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg border border-default max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <OptimizedNewAlertForm
              onSubmit={handleNewSignalSubmit}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};