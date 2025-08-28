
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
import { createTpUpdateDto } from '@/utils/tradingUtils';
import { toast } from 'sonner';

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
    // Locally widen the type so we can safely use 'cancelled' in filters without changing shared types
    const sigAny = signals as Array<{
      id: string;
      assetName: string;
      tradermadeSymbol: string;
      status: 'active' | 'pending' | 'closed' | 'partially_profited' | 'cancelled';
      createdAt: string;
      updatedAt: string;
      [key: string]: any;
    }>;

    const filtered = sigAny.filter(signal => {
      const matchesSearch =
        signal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return {
      active: filtered
        .filter(s => s.status === 'active')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      pending: filtered
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      partially_profited: filtered
        .filter(s => s.status === 'partially_profited')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      closed: filtered
        .filter(s => s.status === 'closed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      cancelled: filtered
        .filter(s => s.status === 'cancelled')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    };
  }, [signals, searchTerm, statusFilter]);

  const getStatusCounts = () => {
    const sigAny = signals as Array<{ status: 'active' | 'pending' | 'closed' | 'partially_profited' | 'cancelled' }>;
    return {
      all: sigAny.length,
      active: sigAny.filter(s => s.status === 'active').length,
      pending: sigAny.filter(s => s.status === 'pending').length,
      partially_profited: sigAny.filter(s => s.status === 'partially_profited').length,
      closed: sigAny.filter(s => s.status === 'closed').length,
      cancelled: sigAny.filter(s => s.status === 'cancelled').length,
    };
  };

  // Handler for order activation (pending -> active)
  const handleOrderActivation = async (alert: TradeAlertData, activationPrice: number) => {
    try {
      await TradingApiService.updateAlert(alert.id, {
        status: 'active',
        // Add activation_price if needed in DTO
      });
      toast.success(`${alert.asset_name} order activated at ${activationPrice}`, { duration: 5000 });
      refetch();
    } catch (error) {
      console.error('Error activating order:', error);
      toast.error('Failed to activate order', { duration: 5000 });
    }
  };

  // Handler for take profit hits
  const handleTakeProfitHit = async (alert: TradeAlertData, tpLevel: number) => {
    try {
      const alertForUtils = {
        id: alert.id,
        assetName: alert.asset_name,
        tp1: alert.tp1,
        tp2: alert.tp2,
        tp3: alert.tp3,
        tp4: alert.tp4,
        tp5: alert.tp5,
        tpHits: alert.tp_hits,
        status: alert.status as 'pending' | 'active' | 'closed' | 'partially_profited'
      };

      const updateDto = createTpUpdateDto(alertForUtils, [tpLevel]);
      
      await TradingApiService.updateAlert(alert.id, updateDto);
      
      if (updateDto.status === 'closed') {
        toast.success(`${alert.asset_name} closed - All TPs hit!`, { duration: 5000 });
      } else {
        toast.success(`${alert.asset_name} TP${tpLevel} hit`, { duration: 5000 });
      }
      
      refetch();
    } catch (error) {
      console.error('Error recording TP hit:', error);
      toast.error('Failed to record TP hit', { duration: 5000 });
    }
  };

  // Handler for stop loss hits
  const handleStopLossHit = async (alert: TradeAlertData) => {
    try {
      await TradingApiService.updateAlert(alert.id, {
        status: 'closed',
        closeReason: 'stop_loss'
      });
      toast.error(`${alert.asset_name} stopped out`, { duration: 5000 });
      refetch();
    } catch (error) {
      console.error('Error recording stop loss:', error);
      toast.error('Failed to record stop loss', { duration: 5000 });
    }
  };

  // Handler for manual status updates
  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'closed') {
        updateData.closeReason = 'manual';
      } else if (newStatus === 'cancelled') {
        updateData.closeReason = 'manual';
      }

      await TradingApiService.updateAlert(alert.id, updateData);
      
      if (newStatus === 'cancelled') {
        toast.success(`${alert.asset_name} order cancelled`, { duration: 5000 });
      } else if (newStatus === 'closed') {
        toast.success(`${alert.asset_name} signal closed`, { duration: 5000 });
      }
      
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update signal', { duration: 5000 });
    }
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
      // Map cancelled to closed for display compatibility, but preserve in close_reason
      status: (signal.status === 'cancelled' ? 'closed' : signal.status) as TradeAlertData['status'],
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      tp5: signal.tp5,
      tp_hits: signal.tpHits,
      notes: signal.notes,
      close_reason: signal.status === 'cancelled' ? 'manual' : signal.closeReason,
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
                onOrderActivation={handleOrderActivation}
                onTakeProfitHit={handleTakeProfitHit}
                onStopLossHit={handleStopLossHit}
                onStatusUpdate={handleStatusUpdate}
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
