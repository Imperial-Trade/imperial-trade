
import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, RefreshCw, Grid, List } from 'lucide-react';
import { SignalCard } from '@/components/signals/SignalCard';
import { VirtualizedSignalList } from '@/components/signals/VirtualizedSignalList';
import { ConnectionStatusIndicator } from '@/components/signals/ConnectionStatusIndicator';
import { toast } from '@/hooks/use-toast';

interface SignalsFeedProps {
  className?: string;
}

export const SignalsFeed: React.FC<SignalsFeedProps> = ({ className = '' }) => {
  const { user, profile } = useAuth();
  const [showAllSignals, setShowAllSignals] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'profit'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem('signalsFeed.compactMode') === 'true';
  });

  const {
    alerts,
    isLoading,
    error,
    updateAlert,
    refreshAlerts,
    connectionStatus
  } = useOptimizedTrading(user?.id || '', showAllSignals);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

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
  }, [alerts, searchQuery, statusFilter, sortBy]);

  // Persist compact mode preference
  React.useEffect(() => {
    localStorage.setItem('signalsFeed.compactMode', compactMode.toString());
  }, [compactMode]);

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

  const isOwner = useCallback((userId: string) => {
    return user?.id === userId;
  }, [user?.id]);

  // Get active signal stats
  const signalStats = useMemo(() => {
    const total = filteredAlerts.length;
    const active = filteredAlerts.filter(a => a.status === 'active').length;
    const pending = filteredAlerts.filter(a => a.status === 'pending').length;
    const partiallyProfited = filteredAlerts.filter(a => a.status === 'partially_profited').length;
    
    return { total, active, pending, partiallyProfited };
  }, [filteredAlerts]);

  if (error) {
    return (
      <Card className={`border-red-200 dark:border-red-800 ${className}`}>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Error loading signals: {error}
          </p>
          <Button onClick={refreshAlerts} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Trading Signals Feed</h2>
          <p className="text-muted-foreground">
            {showAllSignals ? 'Live signals from professional traders' : 'Your trading signals'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ConnectionStatusIndicator status={connectionStatus} />
          <Button onClick={refreshAlerts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Signal Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{signalStats.total}</div>
            <div className="text-sm text-muted-foreground">Total Signals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{signalStats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{signalStats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{signalStats.partiallyProfited}</div>
            <div className="text-sm text-muted-foreground">Partial Profit</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row: Toggles and View Mode */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Row: Search and Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search signals, providers, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
                  <SelectItem value="partially_profited">Partial Profit</SelectItem>
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

            {/* Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Badge variant="outline" className="gap-1">
                <span className="text-muted-foreground">Showing:</span>
                <span className="font-semibold">{filteredAlerts.length}</span>
                <span className="text-muted-foreground">signals</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Grid/List */}
      {isLoading && filteredAlerts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading signals...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No signals found matching your criteria.</p>
            <Button onClick={refreshAlerts} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <VirtualizedSignalList
          alerts={filteredAlerts}
          onUpdate={handleUpdateAlert}
          isOwner={isOwner}
          height={600}
          itemHeight={compactMode ? 140 : 200}
          compact={compactMode}
        />
      ) : (
        <div className={`grid gap-4 ${
          compactMode 
            ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          {filteredAlerts.map((alert) => (
            <SignalCard
              key={alert.id}
              alert={alert}
              onUpdate={handleUpdateAlert}
              isOwner={isOwner(alert.userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
