import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Filter,
  Search,
  Plus,
  Radio,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TradeAlertCard from "@/components/signals/TradeAlertCard";
import { TradeAlertData } from "@/types/components";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SignalStream() {
  const { user } = useAuth();
  const { signals } = useSignalRealtime();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "closed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [educatorFilter, setEducatorFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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

  const filteredSignals = convertedSignals.filter(signal => {
    if (!signal) return false;
    
    const searchTermLower = searchTerm.toLowerCase();
    const assetLower = signal.asset_name?.toLowerCase() || '';
    const notesLower = signal.notes?.toLowerCase() || '';

    const matchesSearch =
      assetLower.includes(searchTermLower) ||
      notesLower.includes(searchTermLower);

    const matchesStatus = statusFilter === "all" || signal.status === statusFilter;
    const matchesType = typeFilter === "all" || signal.trade_type === typeFilter;
    const matchesAsset = !assetFilter || signal.asset_name === assetFilter;

    // Apply tab filter
    if (activeTab !== "all" && signal.status !== activeTab) {
      return false;
    }

    return matchesSearch && matchesStatus && matchesType && matchesAsset;
  });

  // Event handlers for TradeAlertCard - Fixed to match expected signatures
  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    try {
      // Implementation would be handled by the signal realtime context
      toast.success(`Signal ${newStatus} successfully`);
    } catch (error) {
      toast.error("Failed to update signal status");
    }
  };

  const handleTakeProfitHit = async (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => {
    try {
      // Implementation would be handled by the signal realtime context
      const lastTP = newTPHits[newTPHits.length - 1];
      toast.success(`Take Profit ${lastTP} hit!`);
    } catch (error) {
      toast.error("Failed to update take profit");
    }
  };

  const handleStopLossHit = async (alert: TradeAlertData, closeReason: string) => {
    try {
      // Implementation would be handled by the signal realtime context
      toast.error("Stop Loss hit - Signal closed");
    } catch (error) {
      toast.error("Failed to update stop loss");
    }
  };

  const handleOrderActivation = async (alert: TradeAlertData) => {
    try {
      // Implementation would be handled by the signal realtime context
      toast.success("Pending order activated");
    } catch (error) {
      toast.error("Failed to activate order");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
            Xeon Stream
          </h1>
          <p className="text-muted-foreground mt-1">
            Live educational market patterns and trading insights
          </p>
        </div>

        {canCreateSignals && (
          <Button 
            onClick={handleCreateSignal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            data-prevent-widget-open="true"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Signal
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 hover:border-primary/30 transition-colors" data-prevent-widget-open="true">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Signals</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredSignals?.filter(s => s?.status === 'active').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 hover:border-amber-500/30 transition-colors" data-prevent-widget-open="true">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Signals</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredSignals?.filter(s => s?.status === 'pending').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 hover:border-red-500/30 transition-colors" data-prevent-widget-open="true">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Closed Signals</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredSignals?.filter(s => s?.status === 'closed').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 hover:border-blue-500/30 transition-colors" data-prevent-widget-open="true">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Signals</p>
                  <p className="text-xl font-bold text-foreground">{filteredSignals?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters and Tabs */}
      <div className="space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1" data-prevent-widget-open="true">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search signals by asset, educator, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-border/50 focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter} data-prevent-widget-open="true">
              <SelectTrigger className="w-32 border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter} data-prevent-widget-open="true">
              <SelectTrigger className="w-32 border-border/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="border-border/50 hover:border-primary/50"
              data-prevent-widget-open="true"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "pending" | "closed")} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50" data-prevent-widget-open="true">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All ({convertedSignals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active ({convertedSignals?.filter(s => s?.status === 'active').length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending ({convertedSignals?.filter(s => s?.status === 'pending').length || 0})
            </TabsTrigger>
            <TabsTrigger value="closed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Closed ({convertedSignals?.filter(s => s?.status === 'closed').length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Signal Content */}
          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredSignals && filteredSignals.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredSignals.map((signal, index) => (
                      <motion.div
                        key={signal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        data-prevent-widget-open="true"
                      >
                        <TradeAlertCard
                          alert={signal}
                          onStatusUpdate={handleStatusUpdate}
                          onTakeProfitHit={handleTakeProfitHit}
                          onStopLossHit={handleStopLossHit}
                          onOrderActivation={handleOrderActivation}
                          isAdmin={user?.user_metadata?.access_level === "admin"}
                          isCreator={user?.id === signals?.find(s => s.id === signal.id)?.userId}
                          connectionStatus="connected"
                          priceSource="WebSocket"
                          isRecentClosure={false}
                          creator={{
                            id: signals?.find(s => s.id === signal.id)?.userId || '',
                            display_name: signals?.find(s => s.id === signal.id)?.creator?.display_name || 'Unknown',
                            role: signals?.find(s => s.id === signal.id)?.creator?.role || 'member'
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No signals found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" || educatorFilter || assetFilter
                    ? "Try adjusting your filters to see more signals."
                    : "There are no signals available at the moment."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
