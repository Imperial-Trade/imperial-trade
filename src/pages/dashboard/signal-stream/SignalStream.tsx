
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Radio,
  Search,
  Activity,
  Clock,
  CheckCircle,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TradeAlertCard from "@/components/signals/TradeAlertCard";
import { LiveMarketTicker } from "@/components/signals/LiveMarketTicker";
import { TradeAlertData } from "@/types/components";

interface FilterState {
  search: string;
  type: string;
  educator: string;
  status: "all" | "active" | "pending" | "closed";
}

export default function SignalStream() {
  const { user } = useAuth();
  const { signals } = useSignalRealtime();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    educator: 'all',
    status: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const canCreateSignals = user?.user_metadata?.user_type === "educator" || user?.user_metadata?.access_level === "admin";

  const handleCreateSignal = () => {
    navigate('/dashboard/new-signal');
  };

  // Convert signals to TradeAlertData format
  const convertedSignals: TradeAlertData[] = signals?.map(signal => ({
    id: signal.id,
    asset_name: signal.assetName,
    tradermade_symbol: signal.tradermadeSymbol,
    trade_type: signal.tradeType as 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
    entry_price: signal.entryPrice,
    stop_loss: signal.stopLoss,
    tp1: signal.tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    tp4: signal.tp4,
    tp5: signal.tp5,
    status: signal.status,
    tp_hits: signal.tpHits || [],
    close_reason: signal.closeReason,
    notes: signal.notes,
    created_date: signal.createdAt,
    updated_date: signal.updatedAt
  })) || [];

  // Apply all filters
  const filteredSignals = useMemo(() => {
    return convertedSignals.filter(signal => {
      if (!signal) return false;
      
      const searchTermLower = filters.search.toLowerCase();
      const assetLower = signal.asset_name?.toLowerCase() || '';
      const notesLower = signal.notes?.toLowerCase() || '';

      const matchesSearch = !filters.search || 
        assetLower.includes(searchTermLower) ||
        notesLower.includes(searchTermLower);

      const matchesType = filters.type === "all" || signal.trade_type === filters.type;

      // Apply status filter
      if (filters.status !== "all" && signal.status !== filters.status) {
        return false;
      }

      return matchesSearch && matchesType;
    });
  }, [convertedSignals, filters]);

  // Calculate signal counts
  const signalCount = useMemo(() => ({
    total: convertedSignals.length,
    active: convertedSignals.filter(s => s?.status === 'active').length,
    pending: convertedSignals.filter(s => s?.status === 'pending').length,
    closed: convertedSignals.filter(s => s?.status === 'closed').length
  }), [convertedSignals]);

  // Get educators for filter
  const educators = useMemo(() => {
    const educatorList = signals?.map(s => s.creator?.display_name).filter(Boolean) || [];
    return [...new Set(educatorList)].slice(0, 10);
  }, [signals]);

  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    // Implementation for status updates would go here
    console.log('Status update:', alert.id, newStatus);
  };

  const handleTakeProfitHit = async (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => {
    // Implementation for TP hits would go here
    console.log('TP hit:', alert.id, newTPHits);
  };

  const handleStopLossHit = async (alert: TradeAlertData, closeReason: string) => {
    // Implementation for SL hits would go here
    console.log('SL hit:', alert.id, closeReason);
  };

  const handleOrderActivation = async (alert: TradeAlertData) => {
    // Implementation for order activation would go here
    console.log('Order activation:', alert.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Live Market Ticker */}
      <LiveMarketTicker className="sticky top-0 z-40" />

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left Sidebar */}
        <div className="w-80 bg-black/40 backdrop-blur-xl border-r border-gray-800/50 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Radio className="w-8 h-8 text-green-500" />
                <motion.div
                  className="absolute inset-0 w-8 h-8 border-2 border-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-green-400 to-white bg-clip-text text-transparent">
                  Xeon Stream
                </h1>
                <p className="text-gray-400 text-sm">Live trading signals</p>
              </div>
            </div>

            {canCreateSignals && (
              <Button 
                onClick={handleCreateSignal}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Signal
              </Button>
            )}
          </div>

          {/* Educational Market Patterns */}
          <div className="p-6 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-green-500" />
              <h3 className="text-white font-semibold">Educational Market Patterns</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Learn from real-time market movements and trading strategies from our expert educators.
            </p>
          </div>

          {/* Status Filters */}
          <div className="p-6 border-b border-gray-800/50">
            <div className="space-y-2">
              {[
                { key: "all", label: "All Signals", count: signalCount.total, icon: Activity },
                { key: "active", label: "Active", count: signalCount.active, icon: Radio },
                { key: "pending", label: "Pending", count: signalCount.pending, icon: Clock },
                { key: "closed", label: "Closed", count: signalCount.closed, icon: CheckCircle }
              ].map((item) => (
                <motion.button
                  key={item.key}
                  onClick={() => setFilters(prev => ({ ...prev, status: item.key as any }))}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    filters.status === item.key 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'hover:bg-gray-800/50 text-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-300">
                    {item.count}
                  </Badge>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 space-y-4 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search signals..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 bg-black/20 border-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500/50"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">TYPE</label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-black/20 border-gray-700/50 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-gray-700/50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="buy_limit">Buy Limit</SelectItem>
                  <SelectItem value="sell_limit">Sell Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Educator Filter */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">EDUCATOR</label>
              <Select value={filters.educator} onValueChange={(value) => setFilters(prev => ({ ...prev, educator: value }))}>
                <SelectTrigger className="bg-black/20 border-gray-700/50 text-white">
                  <SelectValue placeholder="All Educators" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-gray-700/50">
                  <SelectItem value="all">All Educators</SelectItem>
                  {educators.map((educator) => (
                    <SelectItem key={educator} value={educator}>{educator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-green-500"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-green-500 opacity-20"></div>
                </div>
              </div>
            ) : filteredSignals && filteredSignals.length > 0 ? (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredSignals.map((signal, index) => (
                      <motion.div
                        key={signal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TradeAlertCard
                          alert={signal}
                          creator={signals?.find(s => s.id === signal.id)?.creator}
                          onStatusUpdate={handleStatusUpdate}
                          onTakeProfitHit={handleTakeProfitHit}
                          onStopLossHit={handleStopLossHit}
                          onOrderActivation={handleOrderActivation}
                          isAdmin={user?.user_metadata?.access_level === "admin"}
                          isCreator={user?.id === signals?.find(s => s.id === signal.id)?.userId}
                          livePrice={Math.random() * 100} // Mock current price
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="mx-auto w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                  <Radio className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">No signals found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {filters.search || filters.type !== "all" || filters.educator !== "all" || filters.status !== "all"
                    ? "Try adjusting your filters to discover more trading opportunities."
                    : "No signals are currently available. Check back soon for new trading opportunities."}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
