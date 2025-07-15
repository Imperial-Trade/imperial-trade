import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { Loader2, AlertTriangle, Wifi, WifiOff, Shield, TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import EconomicSidebar from '@/components/widgets/EconomicSidebar';
import usePriceFeed from '@/components/hooks/usePriceFeed';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { SignalStreamFilters } from '@/components/signals/SignalStreamFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function SignalStream() {
  const { user, profile } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    tradeType: '',
    educator: ''
  });

  const {
    alerts: allAlerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus,
    lastUpdated
  } = useOptimizedTrading(user?.id || '', true);

  const isAdmin = useMemo(() => {
    return profile?.access_level === 'admin' || profile?.role === 'admin';
  }, [profile]);

  const isCreator = useCallback((alertCreatorId: string) => {
    return profile?.id === alertCreatorId;
  }, [profile]);

  const alerts = useMemo(() => {
    let filteredAlerts = allAlerts;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(alert =>
        alert.assetName.toLowerCase().includes(searchLower) ||
        alert.finnhubSymbol.toLowerCase().includes(searchLower) ||
        alert.creator?.display_name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }

    if (filters.tradeType) {
      filteredAlerts = filteredAlerts.filter(alert => alert.tradeType.includes(filters.tradeType));
    }

    if (filters.educator) {
      filteredAlerts = filteredAlerts.filter(alert => alert.creator?.id === filters.educator);
    }

    return filteredAlerts;
  }, [allAlerts, filters]);

  const { activeAlerts, closedAlerts, educatorOptions, signalCounts, marketStats } = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active' || a.status === 'pending');
    const closed = alerts.filter(a => a.status === 'closed');
    
    const educatorsMap = new Map();
    allAlerts.forEach(alert => {
      if (alert.creator && (
        alert.creator.user_type === 'educator' || 
        alert.creator.access_level === 'admin' || 
        alert.creator.role === 'admin'
      )) {
        educatorsMap.set(alert.creator.id, {
          id: alert.creator.id,
          name: alert.creator.display_name || 'Unknown Educator'
        });
      }
    });
    
    const educatorsList = Array.from(educatorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    const counts = {
      total: alerts.length,
      active: active.length,
      closed: closed.length,
      buy: alerts.filter(a => a.tradeType.includes('buy')).length,
      sell: alerts.filter(a => a.tradeType.includes('sell')).length
    };

    // Calculate market stats
    const stats = {
      totalSignals: allAlerts.length,
      activeSignals: active.length,
      successRate: closed.length > 0 ? Math.round((closed.filter(a => a.closeReason?.includes('tp')).length / closed.length) * 100) : 85,
      avgReturn: "12.4%"
    };
    
    return { 
      activeAlerts: active, 
      closedAlerts: closed, 
      educatorOptions: educatorsList,
      signalCounts: counts,
      marketStats: stats
    };
  }, [alerts, allAlerts]);

  const sortedClosedAlerts = useMemo(() => {
    return [...closedAlerts]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 12);
  }, [closedAlerts]);
  
  const symbols = useMemo(() => {
    const symbolSet = new Set();
    
    activeAlerts.forEach(alert => {
      if (alert && alert.finnhubSymbol) {
        symbolSet.add(alert.finnhubSymbol);
      }
    });
    
    return Array.from(symbolSet) as string[];
  }, [activeAlerts]);

  const { prices: livePrices, connectionStatus: priceConnectionStatus, priceSource } = usePriceFeed(symbols);

  const [updateInProgress, setUpdateInProgress] = useState(new Set<string>());

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
            <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-ping"></div>
            Live Market Data
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'error':
      case 'disconnected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline Mode
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    
    if (!alertIsCreator && !isAdmin) {
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You can only close your own signals'
        });
      }
      return;
    }
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      const updateDto: UpdateTradeAlertDto = { 
        status: newStatus as 'pending' | 'active' | 'closed', 
        closeReason: newStatus === 'closed' ? 'manual' : undefined 
      };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && newStatus === 'closed' && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_closed',
          title: `🔒 Signal Closed`,
          message: `${alert.assetName} signal has been closed`
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      if ((window as any).addNotification) {
        (window as any).addNotification({ 
          type: 'error', 
          title: 'Update Failed', 
          message: 'Could not update signal status. Please try again.' 
        });
      }
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleTakeProfitHit = useCallback(async (alert: any, newTPHits: number[], shouldAutoClose = false, closeReason: string | null = null) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | undefined = undefined;
      
      if (shouldAutoClose && closeReason) {
        switch (closeReason) {
          case 'manual':
          case 'stop_loss':
          case 'tp1':
          case 'tp2':
          case 'tp3':
          case 'tp4':
          case 'tp5':
          case 'reversal_after_tp':
            typedCloseReason = closeReason;
            break;
          default:
            typedCloseReason = 'manual';
        }
      }
      
      const updateDto: UpdateTradeAlertDto = { 
        tpHits: newTPHits,
        ...(shouldAutoClose && { 
          status: 'closed', 
          closeReason: typedCloseReason
        })
      };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
        if (highestTP !== null) {
          (window as any).addNotification({
            type: 'tp_hit',
            title: `🎯 TP${highestTP} Hit!`,
            message: `${alert.assetName} reached Take Profit ${highestTP}`
          });
        }
      }
    } catch (err) {
      console.error("Failed to update TP hits:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' = 'stop_loss';
      
      switch (closeReason) {
        case 'manual':
        case 'stop_loss':
        case 'tp1':
        case 'tp2':
        case 'tp3':
        case 'tp4':
        case 'tp5':
        case 'reversal_after_tp':
          typedCloseReason = closeReason;
          break;
        default:
          typedCloseReason = 'stop_loss';
      }
      
      const updateDto: UpdateTradeAlertDto = { 
        status: 'closed', 
        closeReason: typedCloseReason
      };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'stop_loss',
          title: `🚨 Stop Loss Hit!`,
          message: `${alert.assetName} trade closed at stop loss`
        });
      }
    } catch (err) {
      console.error("Failed to update stop loss:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.has(alert.id)) return;
    
    const alertIsCreator = isCreator(alert.creator?.id);
    
    if (!alertIsCreator && !isAdmin) {
      return;
    }
    
    setUpdateInProgress(prev => new Set(prev).add(alert.id));
    
    try {
      const updateDto: UpdateTradeAlertDto = { status: 'active' };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && (window as any).addNotification) {
        (window as any).addNotification({
          type: 'trade_activated',
          title: `🚀 Order Activated!`,
          message: `${alert.assetName} ${alert.tradeType} is now active`
        });
      }
    } catch (err) {
      console.error("Failed to activate order:", err);
    } finally {
      setUpdateInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  }, [updateInProgress, updateAlert, profile, isAdmin, isCreator]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-emerald-500/5">
      <NotificationSystem />
      
      {/* Robinhood-style Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Professional Signals</h1>
                  <p className="text-sm text-muted-foreground">Real-time trading signals from verified professionals</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {getConnectionStatusBadge()}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Robinhood-style Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Signals</p>
                    <p className="text-2xl font-bold text-foreground">{marketStats.totalSignals}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Now</p>
                    <p className="text-2xl font-bold text-emerald-500">{marketStats.activeSignals}</p>
                  </div>
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</p>
                    <p className="text-2xl font-bold text-foreground">{marketStats.successRate}%</p>
                  </div>
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Return</p>
                    <p className="text-2xl font-bold text-green-500">{marketStats.avgReturn}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <SignalStreamFilters
              filters={filters}
              onFiltersChange={setFilters}
              educatorOptions={educatorOptions}
              signalCounts={signalCounts}
            />
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64 flex-col space-y-4">
                <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-muted-foreground">Loading professional signals...</p>
                  {connectionStatus === 'connecting' && (
                    <p className="text-xs text-muted-foreground mt-1">Establishing real-time connection...</p>
                  )}
                </div>
              </div>
            ) : error ? (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Connection Error</h3>
                  <p className="text-muted-foreground mb-6">{error}</p>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={() => refreshAlerts()} className="bg-emerald-500 hover:bg-emerald-600">
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Refresh Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Active Signals */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground flex items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
                      Live Signals
                      <Badge className="ml-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {activeAlerts.length} Active
                      </Badge>
                    </h2>
                  </div>
                  
                  {activeAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {activeAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <TradeAlertCard
                            alert={{
                              ...alert,
                              asset_name: alert.assetName,
                              trade_type: alert.tradeType,
                              entry_price: alert.entryPrice,
                              stop_loss: alert.stopLoss,
                              tp1: alert.tp1,
                              tp2: alert.tp2,
                              tp3: alert.tp3,
                              tp4: alert.tp4,
                              tp5: alert.tp5,
                              tp_hits: alert.tpHits,
                              close_reason: alert.closeReason,
                              finnhub_symbol: alert.finnhubSymbol,
                              created_date: alert.createdAt,
                              updated_date: alert.updatedAt,
                              id: alert.id
                            }}
                            livePrice={livePrices[alert.finnhubSymbol]}
                            priceSource={priceSource}
                            onStatusUpdate={handleStatusUpdate}
                            onTakeProfitHit={handleTakeProfitHit}
                            onStopLossHit={handleStopLossHit}
                            onOrderActivation={handleOrderActivation}
                            canUpdate={(isCreator(alert.creator?.id) || isAdmin)}
                            creator={alert.creator}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-card/30 border-border/30">
                      <CardContent className="text-center py-12">
                        <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Active Signals</h3>
                        <p className="text-muted-foreground">New signals will appear here when published by educators</p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>

                {/* Recent Closed Signals */}
                {sortedClosedAlerts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-foreground flex items-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                        Recent Closes
                        <Badge className="ml-3 bg-gray-500/20 text-gray-400 border-gray-500/30">
                          {sortedClosedAlerts.length} Closed
                        </Badge>
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {sortedClosedAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <TradeAlertCard
                            alert={{
                              ...alert,
                              asset_name: alert.assetName,
                              trade_type: alert.tradeType,
                              entry_price: alert.entryPrice,
                              stop_loss: alert.stopLoss,
                              tp1: alert.tp1,
                              tp2: alert.tp2,
                              tp3: alert.tp3,
                              tp4: alert.tp4,
                              tp5: alert.tp5,
                              tp_hits: alert.tpHits,
                              close_reason: alert.closeReason,
                              finnhub_symbol: alert.finnhubSymbol,
                              created_date: alert.createdAt,
                              updated_date: alert.updatedAt,
                              id: alert.id
                            }}
                            livePrice={livePrices[alert.finnhubSymbol]}
                            priceSource={priceSource}
                            onStatusUpdate={handleStatusUpdate}
                            onTakeProfitHit={handleTakeProfitHit}
                            onStopLossHit={handleStopLossHit}
                            onOrderActivation={handleOrderActivation}
                            canUpdate={(isCreator(alert.creator?.id) || isAdmin)}
                            creator={alert.creator}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {/* Economic Sidebar */}
          <div className="xl:col-span-1">
            <EconomicSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}