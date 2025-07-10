
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { OptimizedNewAlertForm } from '@/components/signals/OptimizedNewAlertForm';
import { TradeAlertCard } from '@/components/signals/TradeAlertCard';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { useOptimizedTradingRealtime } from '@/hooks/useOptimizedTradingRealtime';
import { tradingApiService } from '@/api/services/TradingApiService';
import { adminAuditService } from '@/api/services/AdminAuditService';

interface AdminTradeSignalsTabProps {
  currentUser: any;
}

export function AdminTradeSignalsTab({ currentUser }: AdminTradeSignalsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [signalStats, setSignalStats] = useState({
    totalSignals: 0,
    activeSignals: 0,
    closedSignals: 0,
    successRate: 0
  });

  const { 
    tradeAlerts, 
    loading, 
    error, 
    refetch 
  } = useOptimizedTrading();

  // Enable real-time updates
  useOptimizedTradingRealtime();

  useEffect(() => {
    if (tradeAlerts.length > 0) {
      calculateStats();
    }
  }, [tradeAlerts]);

  const calculateStats = () => {
    const total = tradeAlerts.length;
    const active = tradeAlerts.filter(alert => alert.status === 'active').length;
    const closed = tradeAlerts.filter(alert => alert.status === 'closed').length;
    const successful = tradeAlerts.filter(alert => 
      alert.status === 'closed' && alert.tp_hits && alert.tp_hits.length > 0
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
        asset_name: signalData.asset_name,
        finnhub_symbol: signalData.finnhub_symbol,
        trade_type: signalData.trade_type,
        entry_price: signalData.entry_price,
        stop_loss: signalData.stop_loss,
        tp1: signalData.tp1,
        tp2: signalData.tp2,
        tp3: signalData.tp3,
        tp4: signalData.tp4,
        tp5: signalData.tp5,
        notes: signalData.notes
      });

      if (result.success) {
        console.log('Signal created successfully:', result.data);
        
        // Log admin action
        if (currentUser) {
          await adminAuditService.logAdminAction(
            'create_trade_signal',
            currentUser.email || 'unknown',
            'trade_alert',
            result.data.id,
            {
              asset_name: signalData.asset_name,
              trade_type: signalData.trade_type,
              entry_price: signalData.entry_price
            }
          );
        }

        // Refresh the trade alerts list
        refetch();
        
        // Hide the form
        setShowCreateForm(false);
        
        return { success: true, data: result.data };
      } else {
        console.error('Failed to create signal:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating signal:', error);
      return { success: false, error: 'Failed to create signal' };
    }
  };

  const handleSignalUpdate = async (signalId: string, updates: any) => {
    try {
      const result = await tradingApiService.updateAlert(signalId, updates);
      
      if (result.success && currentUser) {
        // Log admin action
        await adminAuditService.logAdminAction(
          'update_trade_signal',
          currentUser.email || 'unknown',
          'trade_alert',
          signalId,
          updates
        );
        
        // Refresh the list
        refetch();
      }
      
      return result;
    } catch (error) {
      console.error('Error updating signal:', error);
      return { success: false, error: 'Failed to update signal' };
    }
  };

  const handleSignalDelete = async (signalId: string) => {
    try {
      const result = await tradingApiService.deleteAlert(signalId);
      
      if (result.success && currentUser) {
        // Log admin action
        await adminAuditService.logAdminAction(
          'delete_trade_signal',
          currentUser.email || 'unknown',
          'trade_alert',
          signalId,
          { reason: 'Admin deletion' }
        );
        
        // Refresh the list
        refetch();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting signal:', error);
      return { success: false, error: 'Failed to delete signal' };
    }
  };

  if (loading) {
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
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-accent-green hover:bg-accent-green/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showCreateForm ? 'Cancel' : 'Create Signal'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showCreateForm && (
            <div className="p-6 border-b border-border/20">
              <OptimizedNewAlertForm
                onSubmit={handleNewSignalSubmit}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

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
                {tradeAlerts.length > 0 ? (
                  tradeAlerts.map((alert) => (
                    <TradeAlertCard
                      key={alert.id}
                      alert={alert}
                      onUpdate={(updates) => handleSignalUpdate(alert.id, updates)}
                      onDelete={() => handleSignalDelete(alert.id)}
                      isAdmin={true}
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
                {tradeAlerts.filter(alert => alert.status === 'active').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={alert}
                    onUpdate={(updates) => handleSignalUpdate(alert.id, updates)}
                    onDelete={() => handleSignalDelete(alert.id)}
                    isAdmin={true}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="closed" className="p-6">
              <div className="grid gap-4">
                {tradeAlerts.filter(alert => alert.status === 'closed').map((alert) => (
                  <TradeAlertCard
                    key={alert.id}
                    alert={alert}
                    onUpdate={(updates) => handleSignalUpdate(alert.id, updates)}
                    onDelete={() => handleSignalDelete(alert.id)}
                    isAdmin={true}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
