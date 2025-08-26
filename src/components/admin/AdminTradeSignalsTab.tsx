import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { TradeAlertCard } from '@/components/signals/TradeAlertCard';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketPriceFeed } from '@/hooks/useWebSocketPriceFeed';
import { TrendingUp, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradeAlertData } from '@/types/TradeAlertData';

const AdminTradeSignalsTab: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'closed' | 'partially_profited'>('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'asset'>('newest');

  // Get all signals for admin view
  const {
    alerts: allSignals,
    isLoading,
    error,
    connectionStatus,
    updateAlert,
    refreshAlerts,
    lastUpdated
  } = useSignalRealtime(user?.id || '', true); // Show all signals for admin

  // Filtering logic
  const filteredAlerts = useMemo(() => {
    let filtered = [...allSignals];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.asset_name.toLowerCase().includes(searchLower) ||
        alert.tradermade_symbol.toLowerCase().includes(searchLower) ||
        (alert.creator?.display_name?.toLowerCase().includes(searchLower)) ||
        alert.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    if (creatorFilter !== 'all') {
      filtered = filtered.filter(alert => alert.creator?.id === creatorFilter);
    }

    return filtered;
  }, [allSignals, searchTerm, statusFilter, creatorFilter]);

  // Sorting logic
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

  // Filter and sort alerts
  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = allSignals;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.asset_name.toLowerCase().includes(searchLower) ||
        alert.tradermade_symbol.toLowerCase().includes(searchLower) ||
        (alert.creator?.display_name?.toLowerCase().includes(searchLower)) ||
        alert.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Creator filter
    if (creatorFilter !== 'all') {
      filtered = filtered.filter(alert => alert.creator?.id === creatorFilter);
    }

    // Sort
    filtered.sort((a, b) => {
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

    return filtered;
  }, [allSignals, searchTerm, statusFilter, creatorFilter, sortBy]);

  // Get unique symbols for price feed
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

  // Get unique creators for filter dropdown
  const uniqueCreators = useMemo(() => {
    const creators = allSignals
      .map(alert => alert.creator)
      .filter(creator => creator)
      .reduce((acc, creator) => {
        if (creator && !acc.find(c => c.id === creator.id)) {
          acc.push(creator);
        }
        return acc;
      }, [] as NonNullable<TradeAlertData['creator']>[]);
    
    return creators;
  }, [allSignals]);

  // Event handlers
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
      user_id: alert.user_id || alert.creator?.id || user?.id || '',
      creator: alert.creator ? {
        ...alert.creator,
        avatar_url: alert.creator.avatar_url || null
      } : undefined
    }));
  }, [filteredAndSortedAlerts, user?.id]);

  const totalSignals = allSignals.length;
  const pendingSignals = allSignals.filter(alert => alert.status === 'pending').length;
  const activeSignals = allSignals.filter(alert => alert.status === 'active').length;
  const closedSignals = allSignals.filter(alert => alert.status === 'closed').length;
  const partialSignals = allSignals.filter(alert => alert.status === 'partially_profited').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to load signals</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
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
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle>Pending Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSignals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSignals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Closed Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedSignals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Search asset, symbol, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select onValueChange={(value) => setCreatorFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {uniqueCreators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
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
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="partially_profited">Partial</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-4 mt-6">
          {transformedAlerts.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No signals found"
              description={statusFilter === 'all' 
                ? "No trading signals available."
                : `No ${statusFilter} signals found.`}
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
                isAdmin={true}
                isCreator={alert.user_id === user?.id}
                livePrice={prices[alert.tradermade_symbol]}
                connectionStatus={priceConnectionStatus}
                priceSource={priceSource}
                isRecentClosure={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTradeSignalsTab;
