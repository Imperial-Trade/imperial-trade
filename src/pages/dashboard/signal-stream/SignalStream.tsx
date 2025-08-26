import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { useWebSocketPriceFeed } from '@/hooks/useWebSocketPriceFeed';
import { TradeAlertCard } from '@/components/signals/TradeAlertCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConnectionStatusIndicator } from '@/components/signals/ConnectionStatusIndicator';
import { AlertCircle, TrendingUp, TrendingDown, Clock, Filter, Search, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradeAlertData } from '@/types/TradeAlertData';
import { cn } from '@/lib/utils';

// Define a type for the status filter
type StatusFilter = 'all' | 'pending' | 'active' | 'closed' | 'partially_profited';
type TypeFilter = 'all' | 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
type SortBy = 'newest' | 'oldest' | 'asset';

const SignalStream: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showAllSignals, setShowAllSignals] = useState(true);

  // Real-time signal data
  const {
    alerts: realtimeAlerts,
    isLoading: signalsLoading,
    error: signalsError,
    connectionStatus: signalConnectionStatus,
    updateAlert,
    refreshAlerts,
    lastUpdated
  } = useSignalRealtime(user?.id || '', showAllSignals);

  // Filter alerts based on search term, status, and trade type
  const filteredAlerts = useMemo(() => {
    let filtered = realtimeAlerts;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.asset_name.toLowerCase().includes(searchLower) ||
        alert.tradermade_symbol.toLowerCase().includes(searchLower) ||
        alert.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.trade_type === typeFilter);
    }

    return filtered;
  }, [realtimeAlerts, searchTerm, statusFilter, typeFilter]);

  // Sort alerts based on selected criteria
  const sortedAlerts = useMemo(() => {
    const sorted = [...filteredAlerts];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case 'oldest':
          return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
        case 'asset':
          return a.asset_name.localeCompare(b.asset_name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredAlerts, sortBy]);

  const filteredAndSortedAlerts = useMemo(() => {
    return sortedAlerts;
  }, [sortedAlerts]);

  // Extract unique symbols for price feed
  const symbols = useMemo(() => {
    return Array.from(new Set(
      filteredAndSortedAlerts
        .filter(alert => alert.status === 'active' || alert.status === 'partially_profited')
        .map(alert => alert.tradermade_symbol)
    ));
  }, [filteredAndSortedAlerts]);

  // WebSocket price feed
  const { 
    prices, 
    connectionStatus: priceConnectionStatus, 
    priceSource 
  } = useWebSocketPriceFeed(symbols);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
  };

  const handleTypeFilterChange = (value: TypeFilter) => {
    setTypeFilter(value);
  };

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value);
  };

  const handleToggleShowAllSignals = () => {
    setShowAllSignals(prev => !prev);
  };

  const handleStatusUpdate = useCallback(async (alert: TradeAlertData, newStatus: string) => {
    try {
      const dto: UpdateTradeAlertDto = {
        status: newStatus as 'pending' | 'active' | 'closed' | 'partially_profited',
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };

      await updateAlert(alert.id, dto);
      toast.success(`Signal ${alert.asset_name} ${newStatus === 'closed' ? 'closed' : 'updated'} successfully`);
    } catch (error) {
      console.error('Failed to update signal status:', error);
      toast.error('Failed to update signal status');
    }
  }, [updateAlert]);

  const handleTakeProfitHit = useCallback(async (
    alert: TradeAlertData, 
    newTPHits: number[], 
    shouldAutoClose?: boolean, 
    closeReason?: string | null
  ) => {
    try {
      const dto: UpdateTradeAlertDto = {
        tpHits: newTPHits,
        status: shouldAutoClose ? 'closed' : 'partially_profited',
        closeReason: shouldAutoClose && closeReason ? closeReason as any : undefined
      };

      await updateAlert(alert.id, dto);
      
      if (shouldAutoClose) {
        toast.success(`🎯 ${alert.asset_name} - All take profits hit! Signal closed.`);
      } else {
        toast.success(`🎯 ${alert.asset_name} - Take Profit ${newTPHits[newTPHits.length - 1]} hit!`);
      }
    } catch (error) {
      console.error('Failed to update TP hits:', error);
      toast.error('Failed to update take profit status');
    }
  }, [updateAlert]);

  const handleStopLossHit = useCallback(async (alert: TradeAlertData, closeReason: string) => {
    try {
      const dto: UpdateTradeAlertDto = {
        status: 'closed',
        closeReason: closeReason as any
      };

      await updateAlert(alert.id, dto);
      toast.error(`🛑 ${alert.asset_name} - Stop Loss hit. Signal closed.`);
    } catch (error) {
      console.error('Failed to update stop loss:', error);
      toast.error('Failed to update stop loss status');
    }
  }, [updateAlert]);

  const handleOrderActivation = useCallback(async (alert: TradeAlertData) => {
    try {
      const dto: UpdateTradeAlertDto = {
        status: 'active'
      };

      await updateAlert(alert.id, dto);
      toast.success(`✅ ${alert.asset_name} - Order activated!`);
    } catch (error) {
      console.error('Failed to activate order:', error);
      toast.error('Failed to activate order');
    }
  }, [updateAlert]);

  // Transform alerts to include user_id and fix creator avatar_url
  const transformedAlerts = useMemo(() => {
    return filteredAndSortedAlerts.map(alert => ({
      ...alert,
      user_id: alert.user_id || user?.id || '',
      creator: alert.creator ? {
        ...alert.creator,
        avatar_url: alert.creator.avatar_url || null
      } : undefined
    }));
  }, [filteredAndSortedAlerts, user?.id]);

  const totalSignals = realtimeAlerts.length;
  const activeSignals = realtimeAlerts.filter(alert => alert.status === 'active').length;
  const pendingSignals = realtimeAlerts.filter(alert => alert.status === 'pending').length;
  const closedSignals = realtimeAlerts.filter(alert => alert.status === 'closed').length;

  if (authLoading || signalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (signalsError) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to load signals</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">{signalsError}</p>
          <Button onClick={refreshAlerts} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Live Signal Stream
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time trading signals with live market data
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <ConnectionStatusIndicator 
            signalStatus={signalConnectionStatus}
            priceStatus={priceConnectionStatus}
            priceSource={priceSource}
            lastUpdated={lastUpdated}
          />
          
          <Button
            onClick={refreshAlerts}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeSignals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingSignals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Closed Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{closedSignals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Search signals..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="col-span-1"
            />

            <Select onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="col-span-1">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="partially_profited">Partially Profited</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="col-span-1">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="buy_limit">Buy Limit</SelectItem>
                <SelectItem value="sell_limit">Sell Limit</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={handleSortByChange}>
              <SelectTrigger className="col-span-1">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="asset">Asset Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Signal Tabs */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="partially_profited">Partial</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
        
        <div className="space-y-4">
          {transformedAlerts.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No signals found"
              description={statusFilter === 'all' 
                ? "No trading signals available at the moment."
                : `No ${statusFilter} signals found. Try adjusting your filters.`}
            />
          ) : (
            transformedAlerts.map((alert) => (
              <TradeAlertCard
                key={alert.id}
                alert={alert}
                onStatusUpdate={handleStatusUpdate}
                onTakeProfitHit={handleTakeProfitHit}
                onStopLossHit={handleStopLossHit}
                onOrderActivation={handleOrderActivation}
                isAdmin={user?.role === 'admin'}
                isCreator={alert.user_id === user?.id}
                livePrice={prices[alert.tradermade_symbol]}
                connectionStatus={priceConnectionStatus}
                priceSource={priceSource}
                isRecentClosure={false}
              />
            ))
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default SignalStream;
