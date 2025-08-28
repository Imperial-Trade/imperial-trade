
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TradingApiService } from '@/api/services/TradingApiService';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus } from 'lucide-react';
import { TradeAlertData } from '@/components/signals/TradeAlertData';
import { SignalCreateDialog } from '@/components/signals/SignalCreateDialog';

// Define the complete status filter type including 'cancelled'
type StatusFilter = 'all' | 'active' | 'pending' | 'closed' | 'partially_profited' | 'cancelled';

export const SignalStream = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: signals = [], isLoading, refetch } = useQuery({
    queryKey: ['trade-alerts'],
    queryFn: () => TradingApiService.getAllAlerts(true),
  });

  // Group signals by status for better organization
  const groupedSignals = useMemo(() => {
    const filtered = signals.filter(signal => {
      const matchesSearch = signal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          signal.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return {
      active: filtered.filter(s => s.status === 'active').sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
      pending: filtered.filter(s => s.status === 'pending').sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      partially_profited: filtered.filter(s => s.status === 'partially_profited').sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
      closed: filtered.filter(s => s.status === 'closed').sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
      cancelled: filtered.filter(s => s.status === 'cancelled').sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    };
  }, [signals, searchTerm, statusFilter]);

  const getStatusCounts = () => {
    return {
      all: signals.length,
      active: signals.filter(s => s.status === 'active').length,
      pending: signals.filter(s => s.status === 'pending').length,
      partially_profited: signals.filter(s => s.status === 'partially_profited').length,
      closed: signals.filter(s => s.status === 'closed').length,
      cancelled: signals.filter(s => s.status === 'cancelled').length
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Signal Stream</h1>
          <p className="text-muted-foreground">Live trading signals and educational patterns</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Signal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search signals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'pending', 'partially_profited', 'closed', 'cancelled'] as const).map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All' : 
               status === 'partially_profited' ? 'Partial Profit' : 
               status.replace('_', ' ')} ({statusCounts[status] || 0})
            </Button>
          ))}
        </div>
      </div>

      {/* Signal Groups */}
      <div className="space-y-8">
        {statusFilter === 'all' ? (
          <>
            {renderSignalGroup('🟢 Active Signals', groupedSignals.active, 'No active signals')}
            {renderSignalGroup('🟡 Pending Orders', groupedSignals.pending, 'No pending orders')}
            {renderSignalGroup('🔵 Partial Profit', groupedSignals.partially_profited, 'No partially profited signals')}
            {renderSignalGroup('⚫ Closed Signals', groupedSignals.closed, 'No closed signals')}
            {renderSignalGroup('🔴 Cancelled Orders', groupedSignals.cancelled, 'No cancelled orders')}
          </>
        ) : (
          renderSignalGroup(
            statusFilter === 'partially_profited' ? 'Partial Profit Signals' : 
            `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Signals`,
            groupedSignals[statusFilter],
            `No ${statusFilter} signals found`
          )
        )}
      </div>

      {/* Create Signal Dialog */}
      <SignalCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );

  function mapToTradeAlertData(signal: any): TradeAlertData {
    return {
      id: signal.id,
      asset_name: signal.assetName,
      tradermade_symbol: signal.tradermadeSymbol,
      trade_type: signal.tradeType,
      entry_price: signal.entryPrice,
      stop_loss: signal.stopLoss,
      status: signal.status,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      tp5: signal.tp5,
      tp_hits: signal.tpHits,
      notes: signal.notes,
      close_reason: signal.closeReason,
      created_date: signal.createdAt,
      updated_date: signal.updatedAt,
      creator: signal.creator
    };
  }

  function renderSignalGroup(title: string, signals: any[], emptyMessage: string) {
    if (signals.length === 0 && statusFilter === 'all') return null;
    
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary">{signals.length}</Badge>
        </div>
        {signals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {signals.map(signal => (
              <TradeAlertCard
                key={signal.id}
                alert={mapToTradeAlertData(signal)}
                onRefresh={refetch}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    );
  }
};

export default SignalStream;
