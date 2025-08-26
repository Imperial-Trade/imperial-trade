
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, Search, Grid, List, Loader2 } from 'lucide-react';
import { VirtualizedSignalList } from '@/components/signals/VirtualizedSignalList';
import { usePaginatedSignals } from '@/hooks/usePaginatedSignals';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { SignalPostingModal } from '@/components/signals/SignalPostingModal';
import { ConnectionStatusIndicator } from '@/components/signals/ConnectionStatusIndicator';
import { toast } from '@/hooks/use-toast';

const CONTAINER_HEIGHT = 600; // Fixed height for virtual scrolling

export const SignalStream: React.FC = () => {
  const { user } = useAuth();
  const [showAllSignals, setShowAllSignals] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem('signalStream.compactMode') === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'profit'>('newest');

  const canPostSignals = user?.access_level === 'admin' || user?.role === 'educator';

  const {
    alerts: rawAlerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    refreshAlerts,
    connectionStatus
  } = useOptimizedTrading(user?.id || '', showAllSignals);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = rawAlerts;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.assetName.toLowerCase().includes(query) ||
        alert.creator?.display_name?.toLowerCase().includes(query) ||
        alert.notes?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'profit':
          // Sort by potential profit (basic heuristic)
          const aProfit = a.tp1 ? (a.tp1 - a.entryPrice) : 0;
          const bProfit = b.tp1 ? (b.tp1 - b.entryPrice) : 0;
          return bProfit - aProfit;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [rawAlerts, searchQuery, statusFilter, sortBy]);

  // Paginated signals with prefetching
  const {
    displayedSignals,
    hasMore,
    isLoading: isPaginating,
    loadMore,
    reset: resetPagination
  } = usePaginatedSignals({
    signals: filteredAlerts,
    pageSize: 50,
    prefetchThreshold: 0.8
  });

  // Infinite scroll setup
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: isPaginating,
    onLoadMore: loadMore,
    threshold: 0.1,
    rootMargin: '100px'
  });

  // Persist compact mode preference
  useEffect(() => {
    localStorage.setItem('signalStream.compactMode', compactMode.toString());
  }, [compactMode]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [searchQuery, statusFilter, sortBy, resetPagination]);

  const handleUpdateAlert = useCallback(async (id: string, updates: any) => {
    try {
      const success = await updateAlert(id, updates);
      if (success) {
        toast({
          title: "Signal Updated",
          description: "The signal has been updated successfully."
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update the signal. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the signal.",
        variant: "destructive"
      });
    }
  }, [updateAlert]);

  const handlePostSignal = useCallback(async (signalData: any) => {
    try {
      const success = await createAlert(signalData);
      if (success) {
        setIsPostModalOpen(false);
        toast({
          title: "Signal Posted",
          description: "Your signal has been posted successfully."
        });
      } else {
        toast({
          title: "Posting Failed",
          description: "Failed to post the signal. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error posting signal:', error);
      toast({
        title: "Error",
        description: "An error occurred while posting the signal.",
        variant: "destructive"
      });
    }
  }, [createAlert]);

  const isOwner = useCallback((userId: string) => {
    return user?.id === userId;
  }, [user?.id]);

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              Error loading signals: {error}
            </p>
            <Button onClick={refreshAlerts} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Signals</h1>
          <p className="text-muted-foreground">
            {showAllSignals ? 'All active signals from educators' : 'Your trading signals'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ConnectionStatusIndicator status={connectionStatus} />
          
          {canPostSignals && (
            <Button onClick={() => setIsPostModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Post Signal
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showAllSignals}
                  onCheckedChange={setShowAllSignals}
                  id="show-all"
                />
                <label htmlFor="show-all" className="text-sm font-medium">
                  Show All Signals
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                  id="compact-mode"
                />
                <label htmlFor="compact-mode" className="text-sm font-medium">
                  Compact View
                </label>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full lg:w-64"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="partially_profited">Partially Profited</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: 'newest' | 'oldest' | 'profit') => setSortBy(value)}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="profit">Highest Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{filteredAlerts.length}</span>
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Displayed:</span>
              <span className="font-semibold">{displayedSignals.length}</span>
            </Badge>
            {hasMore && (
              <Badge variant="outline" className="gap-1">
                <span className="text-muted-foreground">Loading more...</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signals List */}
      <Card>
        <CardContent className="p-0">
          {isLoading && displayedSignals.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading signals...</span>
            </div>
          ) : displayedSignals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No signals found matching your criteria.</p>
              <Button 
                variant="outline" 
                onClick={refreshAlerts} 
                className="mt-4"
              >
                Refresh
              </Button>
            </div>
          ) : (
            <div className="p-4">
              <VirtualizedSignalList
                alerts={displayedSignals}
                onUpdate={handleUpdateAlert}
                isOwner={isOwner}
                height={CONTAINER_HEIGHT}
                itemHeight={compactMode ? 140 : 200}
                compact={compactMode}
              />
              
              {/* Load more trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {isPaginating && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more signals...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Posting Modal */}
      {canPostSignals && (
        <SignalPostingModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          onSubmit={handlePostSignal}
        />
      )}
    </div>
  );
};

export default SignalStream;
