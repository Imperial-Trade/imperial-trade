
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Radio,
  AlertCircle,
  Search,
  Activity,
  Clock,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CompactSignalCard } from "@/components/signals/CompactSignalCard";
import { LiveMarketTicker } from "@/components/signals/LiveMarketTicker";
import { TradeAlertData } from "@/types/components";

interface FilterState {
  search: string;
  type: string;
  educator: string;
}

export default function SignalStream() {
  const { user } = useAuth();
  const { signals } = useSignalRealtime();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "closed">("all");
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    educator: 'all'
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

      // Apply tab filter
      if (activeTab !== "all" && signal.status !== activeTab) {
        return false;
      }

      return matchesSearch && matchesType;
    });
  }, [convertedSignals, filters, activeTab]);

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
      {/* Live Market Ticker */}
      <LiveMarketTicker className="sticky top-0 z-40" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Radio className="w-10 h-10 text-green-500" />
              <motion.div
                className="absolute inset-0 w-10 h-10 border-2 border-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-400 to-white bg-clip-text text-transparent">
                Xeon Stream
              </h1>
              <p className="text-gray-400 text-lg">
                Live professional trading signals
              </p>
            </div>
          </div>

          {canCreateSignals && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={handleCreateSignal}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold shadow-lg shadow-green-500/25"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Signal
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Compact Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-black/20 p-4 rounded-lg border border-gray-800/50"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search signals..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 bg-black/20 border-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500/50"
            />
          </div>

          {/* Type Filter */}
          <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
            <SelectTrigger className="w-32 bg-black/20 border-gray-700/50 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-gray-700/50">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="buy_limit">Buy Limit</SelectItem>
              <SelectItem value="sell_limit">Sell Limit</SelectItem>
            </SelectContent>
          </Select>

          {/* Educator Filter */}
          <Select value={filters.educator} onValueChange={(value) => setFilters(prev => ({ ...prev, educator: value }))}>
            <SelectTrigger className="w-40 bg-black/20 border-gray-700/50 text-white">
              <SelectValue placeholder="Educator" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-gray-700/50">
              <SelectItem value="all">All Educators</SelectItem>
              {educators.map((educator) => (
                <SelectItem key={educator} value={educator}>{educator}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Horizontal Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "pending" | "closed")} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-black/20 border border-gray-800/50 p-1">
              {[
                { key: "all", label: "All Signals", count: signalCount.total, icon: Activity },
                { key: "active", label: "Active", count: signalCount.active, icon: Radio },
                { key: "pending", label: "Pending", count: signalCount.pending, icon: Clock },
                { key: "closed", label: "Closed", count: signalCount.closed, icon: CheckCircle }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.key}
                  value={tab.key} 
                  className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-green-500/30 text-gray-300 border border-transparent transition-all duration-300"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span className="font-medium">{tab.label}</span>
                  <span className="ml-2 text-xs bg-gray-700/50 px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Signal Content */}
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-green-500"></div>
                    <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-green-500 opacity-20"></div>
                  </div>
                </div>
              ) : filteredSignals && filteredSignals.length > 0 ? (
                <ScrollArea className="h-[700px] pr-4">
                  <div className="space-y-3">
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
                          <CompactSignalCard
                            signal={signal}
                            creator={signals?.find(s => s.id === signal.id)?.creator}
                            currentPrice={Math.random() * 100} // Mock current price
                            pnlData={{
                              unrealizedPnL: Math.random() * 200 - 100,
                              percentage: Math.random() * 20 - 10,
                              isProfit: Math.random() > 0.5
                            }}
                            isAdmin={user?.user_metadata?.access_level === "admin"}
                            isCreator={user?.id === signals?.find(s => s.id === signal.id)?.userId}
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
                    <AlertCircle className="w-12 h-12 text-gray-500" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">No signals found</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {filters.search || filters.type !== "all" || filters.educator !== "all"
                      ? "Try adjusting your filters to discover more trading opportunities."
                      : "No signals are currently available. Check back soon for new trading opportunities."}
                  </p>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
