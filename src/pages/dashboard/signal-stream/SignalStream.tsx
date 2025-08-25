
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Filter,
  Search,
  Plus,
  Zap,
  AlertCircle,
  BarChart3,
  Target,
  Activity,
  Star,
  Flame
} from "lucide-react";

// Import our new professional components
import { XeonStreamLayout } from "@/components/xeon/XeonStreamLayout";
import { ProfessionalSignalCard } from "@/components/xeon/ProfessionalSignalCard";
import { SignalCreationWizard } from "@/components/xeon/SignalCreationWizard";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  const [assetFilter, setAssetFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignalWizard, setShowSignalWizard] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const canCreateSignals = user?.user_metadata?.user_type === "educator" || user?.user_metadata?.access_level === "admin";

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

  // Calculate performance metrics
  const calculateMetrics = () => {
    const active = convertedSignals.filter(s => s.status === 'active').length;
    const pending = convertedSignals.filter(s => s.status === 'pending').length;
    const closed = convertedSignals.filter(s => s.status === 'closed').length;
    const total = convertedSignals.length;
    
    // Mock performance metrics
    const winRate = closed > 0 ? Math.round((active / (active + closed)) * 100) : 0;
    const totalPnL = convertedSignals.reduce((acc, signal) => {
      if (signal.status === 'closed') {
        return acc + (Math.random() - 0.4) * 1000; // Mock P&L
      }
      return acc;
    }, 0);

    return { active, pending, closed, total, winRate, totalPnL };
  };

  const metrics = calculateMetrics();

  const handleCreateSignal = (signalData: any) => {
    // Handle signal creation
    console.log('Creating signal:', signalData);
    toast.success("Signal created successfully!");
  };

  // Event handlers for signal interactions
  const handleStatusUpdate = async (alert: TradeAlertData, newStatus: string) => {
    try {
      toast.success(`Signal ${newStatus} successfully`);
    } catch (error) {
      toast.error("Failed to update signal status");
    }
  };

  const handleTakeProfitHit = async (alert: TradeAlertData, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string | null) => {
    try {
      toast.success(`Take Profit ${newTPHits[newTPHits.length - 1]} hit!`);
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
    <XeonStreamLayout
      title="Xeon Stream"
      subtitle="Professional Trading Signals & Analysis"
      actions={
        canCreateSignals && (
          <Button 
            onClick={() => setShowSignalWizard(true)}
            className="bg-gradient-to-r from-trading-success to-trading-success/80 hover:from-trading-success/90 hover:to-trading-success/70 text-white font-medium shadow-trading-glow-green border-0"
            data-prevent-widget-open="true"
          >
            <Zap className="w-4 h-4 mr-2" />
            Create Signal
          </Button>
        )
      }
    >
      {/* Professional Metrics Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-success/30 transition-all duration-300 shadow-trading-card overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-trading-success-bg rounded-xl">
                <Activity className="w-5 h-5 text-trading-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-trading-text-muted uppercase tracking-wide">Active Signals</p>
                <p className="text-2xl font-bold text-trading-text-primary">{metrics.active}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-trading-success rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-warning/30 transition-all duration-300 shadow-trading-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-trading-warning-bg rounded-xl">
                <Clock className="w-5 h-5 text-trading-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-trading-text-muted uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-trading-text-primary">{metrics.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-text-muted/30 transition-all duration-300 shadow-trading-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-trading-text-muted/10 rounded-xl">
                <BarChart3 className="w-5 h-5 text-trading-text-muted" />
              </div>
              <div>
                <p className="text-xs font-medium text-trading-text-muted uppercase tracking-wide">Closed</p>
                <p className="text-2xl font-bold text-trading-text-primary">{metrics.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-premium/30 transition-all duration-300 shadow-trading-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-trading-info-bg rounded-xl">
                <Target className="w-5 h-5 text-trading-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-trading-text-muted uppercase tracking-wide">Win Rate</p>
                <p className="text-2xl font-bold text-trading-success">{metrics.winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-trading-bg-tertiary border-trading-border hover:border-trading-success/30 transition-all duration-300 shadow-trading-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-trading-success-bg rounded-xl">
                <DollarSign className="w-5 h-5 text-trading-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-trading-text-muted uppercase tracking-wide">Total P&L</p>
                <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-trading-success' : 'text-trading-danger'}`}>
                  {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="bg-trading-bg-tertiary border-trading-border shadow-trading-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1" data-prevent-widget-open="true">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-trading-text-muted w-5 h-5" />
                <Input
                  placeholder="Search signals by asset, notes, or analysis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 bg-trading-bg-secondary border-trading-border text-trading-text-primary focus:border-trading-success h-12 text-base"
                />
              </div>

              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter} data-prevent-widget-open="true">
                  <SelectTrigger className="w-40 bg-trading-bg-secondary border-trading-border text-trading-text-primary h-12">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-trading-bg-secondary border-trading-border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter} data-prevent-widget-open="true">
                  <SelectTrigger className="w-40 bg-trading-bg-secondary border-trading-border text-trading-text-primary h-12">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-trading-bg-secondary border-trading-border">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-trading-border text-trading-text-muted hover:border-trading-success/50 hover:text-trading-text-primary h-12 w-12"
                  data-prevent-widget-open="true"
                >
                  <Filter className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "pending" | "closed")} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-trading-bg-tertiary border border-trading-border h-14 rounded-xl" data-prevent-widget-open="true">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-trading-success data-[state=active]:text-white text-trading-text-muted font-medium h-12 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>All ({convertedSignals?.length || 0})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-trading-success data-[state=active]:text-white text-trading-text-muted font-medium h-12 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4" />
                <span>Active ({metrics.active})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-trading-warning data-[state=active]:text-white text-trading-text-muted font-medium h-12 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending ({metrics.pending})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="closed" 
              className="data-[state=active]:bg-trading-text-muted data-[state=active]:text-white text-trading-text-muted font-medium h-12 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Closed ({metrics.closed})</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Signal Content */}
          <TabsContent value={activeTab} className="mt-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trading-success"></div>
              </div>
            ) : filteredSignals && filteredSignals.length > 0 ? (
              <ScrollArea className="h-[800px] pr-4">
                <div className="space-y-6">
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
                        <ProfessionalSignalCard
                          signal={signal}
                          onStatusUpdate={handleStatusUpdate}
                          onTakeProfitHit={handleTakeProfitHit}
                          className="mb-4"
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
                className="text-center py-20"
              >
                <div className="bg-trading-bg-tertiary rounded-2xl p-12 border border-trading-border max-w-md mx-auto">
                  <AlertCircle className="w-16 h-16 text-trading-text-muted mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-trading-text-primary mb-3">No signals found</h3>
                  <p className="text-trading-text-muted leading-relaxed">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all" || assetFilter
                      ? "Try adjusting your filters to discover more trading opportunities."
                      : "No trading signals are available at the moment. Check back soon for new opportunities."}
                  </p>
                  {canCreateSignals && (
                    <Button
                      onClick={() => setShowSignalWizard(true)}
                      className="mt-6 bg-trading-success hover:bg-trading-success/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Signal
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Signal Creation Wizard */}
      <SignalCreationWizard
        isOpen={showSignalWizard}
        onClose={() => setShowSignalWizard(false)}
        onSubmit={handleCreateSignal}
      />
    </XeonStreamLayout>
  );
}
