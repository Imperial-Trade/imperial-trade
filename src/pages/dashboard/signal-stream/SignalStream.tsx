
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Radio,
  Activity,
  Clock,
  CheckCircle,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CompactSignalSearch from "@/components/signals/CompactSignalSearch";
import { RealtimeConnectionStatus } from "@/components/signals/RealtimeConnectionStatus";
import { EnhancedSignalCard } from "@/components/signals/EnhancedSignalCard";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import { TradeAlertData } from "@/types/components";

interface FilterState {
  search: string;
  type: string;
  educator: string;
  status: "all" | "active" | "pending" | "closed";
}

export default function SignalStream() {
  const { user } = useAuth();
  const { signals, connectionStatus, lastUpdated, refreshSignals } = useSignalRealtime();
  const { requestNotificationPermission, permission } = useSignalNotifications();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    educator: 'all',
    status: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Track new signals for highlighting
  useEffect(() => {
    const currentIds = new Set(signals.map(s => s.id));
    const previousIds = new Set(Array.from(newSignalIds));
    
    // Find truly new signals (not just from initial load)
    const genuinelyNewIds = new Set(
      Array.from(currentIds).filter(id => !previousIds.has(id) && signals.length > 0)
    );
    
    if (genuinelyNewIds.size > 0) {
      setNewSignalIds(prev => new Set([...prev, ...genuinelyNewIds]));
      
      // Clear the "new" status after 10 seconds
      setTimeout(() => {
        setNewSignalIds(prev => {
          const updated = new Set(prev);
          genuinelyNewIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 10000);
    }
  }, [signals]);

  // Auto-request notification permission
  useEffect(() => {
    if (user && permission === 'default') {
      requestNotificationPermission();
    }
  }, [user, permission, requestNotificationPermission]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-gray-800/50">
        <div className="flex items-center justify-between p-4">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
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

          {/* Center: Search & Status */}
          <div className="flex items-center gap-4">
            <CompactSignalSearch 
              onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
              placeholder="Search signals, assets..."
            />
            <RealtimeConnectionStatus
              connectionStatus={connectionStatus}
              lastUpdated={lastUpdated}
              onRefresh={refreshSignals}
              signalCount={signalCount.total}
            />
          </div>

          {/* Right: Create Signal Button */}
          {canCreateSignals && (
            <Button 
              onClick={handleCreateSignal}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Signal
            </Button>
          )}
        </div>

        {/* Navigation Filters Row */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between gap-6">
            {/* Status Tabs */}
            <Tabs value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}>
              <TabsList className="bg-black/20 border-gray-700/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                  <Activity className="w-4 h-4 mr-2" />
                  All ({signalCount.total})
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                  <Radio className="w-4 h-4 mr-2" />
                  Active ({signalCount.active})
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({signalCount.pending})
                </TabsTrigger>
                <TabsTrigger value="closed" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Closed ({signalCount.closed})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Trade Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-36 bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 z-50">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="buy_limit">Buy Limit</SelectItem>
                    <SelectItem value="sell_limit">Sell Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Educator</label>
                <Select value={filters.educator} onValueChange={(value) => setFilters(prev => ({ ...prev, educator: value }))}>
                  <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="All Educators" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 z-50">
                    <SelectItem value="all">All Educators</SelectItem>
                    {educators.map((educator) => (
                      <SelectItem key={educator} value={educator}>{educator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-green-500"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-green-500 opacity-20"></div>
            </div>
          </div>
        ) : filteredSignals && filteredSignals.length > 0 ? (
          <ScrollArea className="h-full">
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
                    <EnhancedSignalCard
                      signal={signal}
                      creator={signals?.find(s => s.id === signal.id)?.creator}
                      isNew={newSignalIds.has(signal.id)}
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
  );
}
