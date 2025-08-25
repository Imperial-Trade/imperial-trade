
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Plus,
  Radio,
  AlertCircle,
  Zap,
  Activity,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProfessionalSignalCard } from "@/components/signals/ProfessionalSignalCard";
import { SignalFilterBar } from "@/components/signals/SignalFilterBar";
import { LiveMarketTicker } from "@/components/signals/LiveMarketTicker";
import { TradeAlertData } from "@/types/components";

interface FilterState {
  search: string;
  status: string;
  type: string;
  asset: string;
  provider: string;
  performance: string;
  timeframe: string;
}

export default function SignalStream() {
  const { user } = useAuth();
  const { signals } = useSignalRealtime();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "closed">("all");
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    type: 'all',
    asset: 'all',
    provider: 'all',
    performance: 'all',
    timeframe: 'all'
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

      const matchesStatus = filters.status === "all" || signal.status === filters.status;
      const matchesType = filters.type === "all" || signal.trade_type === filters.type;
      const matchesAsset = filters.asset === "all" || signal.asset_name === filters.asset;

      // Apply tab filter
      if (activeTab !== "all" && signal.status !== activeTab) {
        return false;
      }

      return matchesSearch && matchesStatus && matchesType && matchesAsset;
    });
  }, [convertedSignals, filters, activeTab]);

  // Calculate signal counts
  const signalCount = useMemo(() => ({
    total: convertedSignals.length,
    active: convertedSignals.filter(s => s?.status === 'active').length,
    pending: convertedSignals.filter(s => s?.status === 'pending').length,
    closed: convertedSignals.filter(s => s?.status === 'closed').length
  }), [convertedSignals]);

  // Get popular assets and providers for filters
  const popularAssets = useMemo(() => {
    const assets = convertedSignals.map(s => s.asset_name).filter(Boolean);
    return [...new Set(assets)].slice(0, 10);
  }, [convertedSignals]);

  const topProviders = useMemo(() => {
    const providers = signals?.map(s => s.creator?.display_name).filter(Boolean) || [];
    return [...new Set(providers)].slice(0, 10);
  }, [signals]);

  // Event handlers for signals
  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    try {
      toast.success(`Signal ${newStatus} successfully`);
    } catch (error) {
      toast.error("Failed to update signal status");
    }
  };

  const handleTakeProfitHit = async (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => {
    try {
      const lastTP = newTPHits[newTPHits.length - 1];
      toast.success(`Take Profit ${lastTP} hit!`);
    } catch (error) {
      toast.error("Failed to update take profit");
    }
  };

  const handleStopLossHit = async (alert: TradeAlertData, closeReason: string) => {
    try {
      toast.error("Stop Loss hit - Signal closed");
    } catch (error) {
      toast.error("Failed to update stop loss");
    }
  };

  const handleOrderActivation = async (alert: TradeAlertData) => {
    try {
      toast.success("Pending order activated");
    } catch (error) {
      toast.error("Failed to activate order");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Live Market Ticker */}
      <LiveMarketTicker className="sticky top-0 z-40" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-accentGreen-light to-white bg-clip-text text-transparent flex items-center gap-3">
              <div className="relative">
                <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-accentGreen-light" />
                <motion.div
                  className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 border-2 border-accentGreen-light rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              Xeon Stream
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Live professional trading signals with institutional-grade analytics
            </p>
          </div>

          {canCreateSignals && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={handleCreateSignal}
                className="bg-gradient-to-r from-accentGreen-light to-accentGreen-light/80 hover:from-accentGreen-light/90 hover:to-accentGreen-light/70 text-black font-semibold shadow-lg shadow-accentGreen-light/25 border-0"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Signal
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Professional Stats Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              title: "Active Signals",
              value: signalCount.active,
              icon: Activity,
              color: "text-accentGreen-light",
              bg: "bg-accentGreen-light/10",
              border: "border-accentGreen-light/20"
            },
            {
              title: "Pending Orders",
              value: signalCount.pending,
              icon: Clock,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              border: "border-amber-400/20"
            },
            {
              title: "Completed",
              value: signalCount.closed,
              icon: BarChart3,
              color: "text-blue-400",
              bg: "bg-blue-400/10",
              border: "border-blue-400/20"
            },
            {
              title: "Total Signals",
              value: signalCount.total,
              icon: Zap,
              color: "text-purple-400",
              bg: "bg-purple-400/10",
              border: "border-purple-400/20"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <Card className={`bg-black/40 backdrop-blur-xl border ${stat.border} hover:border-opacity-40 transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Professional Filter System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SignalFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            signalCount={signalCount}
            popularAssets={popularAssets}
            topProviders={topProviders}
          />
        </motion.div>

        {/* Professional Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "pending" | "closed")} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-black/20 border border-gray-800/50 p-1">
              {[
                { key: "all", label: "All Signals", count: signalCount.total },
                { key: "active", label: "Active", count: signalCount.active },
                { key: "pending", label: "Pending", count: signalCount.pending },
                { key: "closed", label: "Closed", count: signalCount.closed }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.key}
                  value={tab.key} 
                  className="data-[state=active]:bg-accentGreen-light/20 data-[state=active]:text-accentGreen-light data-[state=active]:border-accentGreen-light/30 text-gray-300 border border-transparent transition-all duration-300"
                >
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
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-accentGreen-light"></div>
                    <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-accentGreen-light opacity-20"></div>
                  </div>
                </div>
              ) : filteredSignals && filteredSignals.length > 0 ? (
                <ScrollArea className="h-[700px] pr-4">
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
                          <ProfessionalSignalCard
                            signal={signal}
                            creator={signals?.find(s => s.id === signal.id)?.creator}
                            currentPrice={Math.random() * 100} // Mock current price
                            pnlData={{
                              unrealizedPnL: Math.random() * 200 - 100,
                              percentage: Math.random() * 20 - 10,
                              isProfit: Math.random() > 0.5
                            }}
                            onStatusUpdate={handleStatusUpdate}
                            onTakeProfitHit={handleTakeProfitHit}
                            onStopLossHit={handleStopLossHit}
                            onOrderActivation={handleOrderActivation}
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
                    {filters.search || filters.status !== "all" || filters.type !== "all" || filters.asset !== "all"
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
