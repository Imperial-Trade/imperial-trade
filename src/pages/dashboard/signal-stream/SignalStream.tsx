
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { useWebSocketPriceFeed } from '@/hooks/useWebSocketPriceFeed';
import { EnhancedSignalCard } from '@/components/signals/EnhancedSignalCard';
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
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { cn } from '@/lib/utils';

// Define a type for the status filter
type StatusFilter = 'all' | 'pending' | 'active' | 'closed' | 'partially_profited';
type TypeFilter = 'all' | 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
type SortBy = 'newest' | 'oldest' | 'asset';

// Convert realtime data to TradeAlertWithProfile format for EnhancedSignalCard
const toTradeAlertWithProfile = (a: any): TradeAlertWithProfile => {
  console.log('🔄 Converting signal data:', a);
  
  const result: TradeAlertWithProfile = {
    id: a?.id || '',
    userId: a?.user_id ?? a?.userId ?? '',
    assetName: a?.asset_name ?? a?.assetName ?? '',
    tradermadeSymbol: a?.tradermade_symbol ?? a?.tradermadeSymbol ?? '',
    tradeType: a?.trade_type ?? a?.tradeType ?? 'buy',
    entryPrice: Number(a?.entry_price ?? a?.entryPrice ?? 0),
    stopLoss: Number(a?.stop_loss ?? a?.stopLoss ?? 0),
    status: a?.status ?? 'pending',
    tp1: a?.tp1 ? Number(a.tp1) : undefined,
    tp2: a?.tp2 ? Number(a.tp2) : undefined,
    tp3: a?.tp3 ? Number(a.tp3) : undefined,
    tp4: a?.tp4 ? Number(a.tp4) : undefined,
    tp5: a?.tp5 ? Number(a.tp5) : undefined,
    tpHits: a?.tp_hits ?? a?.tpHits ?? [],
    notes: a?.notes ?? undefined,
    closeReason: a?.close_reason ?? a?.closeReason ?? undefined,
    createdAt: a?.created_at ?? a?.createdAt ?? new Date().toISOString(),
    updatedAt: a?.updated_at ?? a?.updatedAt ?? new Date().toISOString(),
    creator: a?.creator ? {
      id: a.creator.id,
      display_name: a.creator.display_name ?? a.creator.displayName ?? 'Unknown',
      role: a.creator.role ?? 'user',
      avatar_url: a.creator.avatar_url ?? a.creator.avatarUrl ?? null,
    } : {
      id: a?.user_id ?? '',
      display_name: 'Unknown User',
      role: 'user',
      avatar_url: null,
    },
  };

  console.log('✅ Converted signal:', result);
  return result;
};

const SignalStream: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showAllSignals, setShowAllSignals] = useState(true);

  console.log('📊 SignalStream render - User:', user?.id, 'Auth loading:', authLoading);

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

  console.log('📡 SignalStream - Realtime alerts:', {
    count: realtimeAlerts.length,
    loading: signalsLoading,
    error: signalsError,
    connectionStatus: signalConnectionStatus
  });

  const canonicalAlerts = useMemo(() => {
    console.log('🔄 Converting alerts to canonical format, count:', realtimeAlerts.length);
    const converted = realtimeAlerts.map(toTradeAlertWithProfile);
    console.log('✅ Converted alerts:', converted.length);
    return converted;
  }, [realtimeAlerts]);

  // Filter alerts based on search term, status, and trade type
  const filteredAlerts = useMemo(() => {
    console.log('🔍 Filtering alerts - Input count:', canonicalAlerts.length);
    let filtered = canonicalAlerts;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.assetName.toLowerCase().includes(searchLower) ||
        alert.tradermadeSymbol.toLowerCase().includes(searchLower) ||
        alert.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.tradeType === typeFilter);
    }

    console.log('✅ Filtered alerts:', filtered.length, 'Status filter:', statusFilter);
    return filtered;
  }, [canonicalAlerts, searchTerm, statusFilter, typeFilter]);

  // Sort alerts based on selected criteria
  const sortedAlerts = useMemo(() => {
    console.log('📋 Sorting alerts - Input count:', filteredAlerts.length);
    const sorted = [...filteredAlerts];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'asset':
          return a.assetName.localeCompare(b.assetName);
        default:
          return 0;
      }
    });

    console.log('✅ Sorted alerts:', sorted.length);
    return sorted;
  }, [filteredAlerts, sortBy]);

  // Extract unique symbols for price feed
  const symbols = useMemo(() => {
    return Array.from(new Set(
      sortedAlerts
        .filter(alert => alert.status === 'active' || alert.status === 'partially_profited')
        .map(alert => alert.tradermadeSymbol)
    ));
  }, [sortedAlerts]);

  // WebSocket price feed
  const { 
    prices, 
    connectionStatus: priceConnectionStatus, 
    priceSource 
  } = useWebSocketPriceFeed(symbols);

  // Enhanced update handler for EnhancedSignalCard
  const handleUpdateAlert = useCallback(async (id: string, updates: any) => {
    try {
      const dto: UpdateTradeAlertDto = {
        status: updates.status,
        closeReason: updates.closeReason,
        tpHits: updates.tpHits
      };

      await updateAlert(id, dto);
      
      if (updates.status === 'closed') {
        toast.success(`Signal ${id} closed successfully`);
      } else if (updates.tpHits) {
        toast.success(`Take Profit updated for signal ${id}`);
      } else {
        toast.success(`Signal ${id} updated successfully`);
      }
    } catch (error) {
      console.error('Failed to update signal:', error);
      toast.error('Failed to update signal');
    }
  }, [updateAlert]);

  const totalSignals = canonicalAlerts.length;
  const activeSignals = canonicalAlerts.filter(alert => alert.status === 'active').length;
  const pendingSignals = canonicalAlerts.filter(alert => alert.status === 'pending').length;
  const closedSignals = canonicalAlerts.filter(alert => alert.status === 'closed').length;

  console.log('📈 Signal counts:', { totalSignals, activeSignals, pendingSignals, closedSignals });

  if (authLoading) {
    console.log('🔄 Auth loading...');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (signalsLoading && canonicalAlerts.length === 0) {
    console.log('🔄 Signals loading...');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (signalsError) {
    console.error('❌ Signals error:', signalsError);
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

  console.log('🎯 Final render - Sorted alerts to display:', sortedAlerts.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Xeon Stream
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
            lastUpdated={typeof lastUpdated === 'object' ? lastUpdated.getTime() : lastUpdated}
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="text-sm">
              <div>Raw signals: {realtimeAlerts.length}</div>
              <div>Canonical alerts: {canonicalAlerts.length}</div>
              <div>Filtered alerts: {filteredAlerts.length}</div>
              <div>Sorted alerts: {sortedAlerts.length}</div>
              <div>Status filter: {statusFilter}</div>
              <div>Connection: {signalConnectionStatus}</div>
            </div>
          </CardContent>
        </Card>
      )}

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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="col-span-1"
            />

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
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

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
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

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
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

      {/* Signal Display */}
      <div className="space-y-4">
        {sortedAlerts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No signals found"
            description={statusFilter === 'all' 
              ? "No trading signals available at the moment."
              : `No ${statusFilter} signals found. Try adjusting your filters.`}
          />
        ) : (
          sortedAlerts.map((alert) => {
            console.log('🎯 Rendering signal card:', alert.id, alert.assetName);
            return (
              <EnhancedSignalCard
                key={alert.id}
                alert={alert}
                onUpdate={handleUpdateAlert}
                isOwner={alert.userId === user?.id || user?.role === 'admin'}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default SignalStream;
