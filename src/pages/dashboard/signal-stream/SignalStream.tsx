import { useState, useMemo } from 'react';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { TradeAlertCard } from '@/components/signals/TradeAlertCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, WifiOff, Search, BookOpen, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TradeAlertData } from '@/components/signals/TradeAlertData';

// Helper function to convert TradeAlertWithProfile to TradeAlertData
const mapToTradeAlertData = (alert: any): TradeAlertData => ({
  id: alert.id,
  asset_name: alert.assetName,
  tradermade_symbol: alert.tradermadeSymbol,
  trade_type: alert.tradeType,
  entry_price: alert.entryPrice,
  stop_loss: alert.stopLoss,
  status: alert.status,
  tp1: alert.tp1,
  tp2: alert.tp2,
  tp3: alert.tp3,
  tp4: alert.tp4,
  tp5: alert.tp5,
  tp_hits: alert.tpHits || [],
  notes: alert.notes,
  close_reason: alert.closeReason,
  created_date: alert.createdAt,
  updated_date: alert.updatedAt,
  creator: alert.creator
});

export const SignalStream = () => {
  const { user } = useAuth();
  const { alerts, isLoading, connectionStatus } = useOptimizedTrading(user?.id || '', true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [educatorFilter, setEducatorFilter] = useState('all');

  // Filter and organize signals
  const { activeSignals, closedSignals, educators, filteredActiveSignals, filteredClosedSignals } = useMemo(() => {
    // Filter out cancelled signals completely - handle type safely
    const validSignals = alerts.filter(signal => 
      signal.status !== 'cancelled' as any && 
      signal.status !== 'canceled' as any
    );
    
    const active = validSignals.filter(signal => 
      signal.status === 'active' || 
      signal.status === 'pending' || 
      signal.status === 'partially_profited'
    );
    
    const closed = validSignals
      .filter(signal => signal.status === 'closed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 12); // Limit to 12 most recent

    // Get unique educators
    const uniqueEducators = Array.from(
      new Set(validSignals.map(signal => signal.creator?.display_name).filter(Boolean))
    ).sort();

    // Apply filters
    const applyFilters = (signals: typeof validSignals) => {
      return signals.filter(signal => {
        // Search filter
        if (searchTerm && !signal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !signal.tradermadeSymbol?.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && signal.status !== statusFilter) {
          return false;
        }

        // Type filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'buy' && !signal.tradeType.includes('buy')) return false;
          if (typeFilter === 'sell' && !signal.tradeType.includes('sell')) return false;
          if (typeFilter === 'limit' && !signal.tradeType.includes('limit')) return false;
          if (typeFilter === 'market' && signal.tradeType.includes('limit')) return false;
        }

        // Educator filter
        if (educatorFilter !== 'all' && signal.creator?.display_name !== educatorFilter) {
          return false;
        }

        return true;
      });
    };

    return {
      activeSignals: active,
      closedSignals: closed,
      educators: uniqueEducators,
      filteredActiveSignals: applyFilters(active),
      filteredClosedSignals: applyFilters(closed)
    };
  }, [alerts, searchTerm, statusFilter, typeFilter, educatorFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading educational patterns...</p>
        </div>
      </div>
    );
  }

  const connectionIcon = connectionStatus === 'connected' ? (
    <Wifi className="w-4 h-4 text-green-500" />
  ) : (
    <WifiOff className="w-4 h-4 text-red-500" />
  );

  const connectionText = connectionStatus === 'connected' ? 'Connected' : 'Disconnected';
  const connectionColor = connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Xeon Stream</h1>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Users className="w-3 h-3 mr-1" />
            Educational Contributors
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {connectionIcon}
          <span className={`text-sm font-medium ${connectionColor}`}>
            {connectionText}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({activeSignals.length + closedSignals.length})</SelectItem>
              <SelectItem value="pending">Pending ({activeSignals.filter(s => s.status === 'pending').length})</SelectItem>
              <SelectItem value="active">Active ({activeSignals.filter(s => s.status === 'active').length})</SelectItem>
              <SelectItem value="partially_profited">Partial TP ({activeSignals.filter(s => s.status === 'partially_profited').length})</SelectItem>
              <SelectItem value="closed">Closed ({closedSignals.length})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy Orders</SelectItem>
              <SelectItem value="sell">Sell Orders</SelectItem>
              <SelectItem value="limit">Limit Orders</SelectItem>
              <SelectItem value="market">Market Orders</SelectItem>
            </SelectContent>
          </Select>

          <Select value={educatorFilter} onValueChange={setEducatorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Educator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Educators</SelectItem>
              {educators.map((educator) => (
                <SelectItem key={educator} value={educator}>
                  {educator}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Active Educational Patterns */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Educational Market Patterns ({filteredActiveSignals.length})
        </h2>
        {filteredActiveSignals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredActiveSignals.map((alert) => (
              <TradeAlertCard key={alert.id} alert={mapToTradeAlertData(alert)} showCreator={true} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No active educational patterns available</p>
          </Card>
        )}
      </div>

      {/* Recent Educational Analysis */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Educational Analysis ({filteredClosedSignals.length})
        </h2>
        {filteredClosedSignals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClosedSignals.map((alert) => (
              <TradeAlertCard key={alert.id} alert={mapToTradeAlertData(alert)} showCreator={true} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent educational analysis available</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SignalStream;
