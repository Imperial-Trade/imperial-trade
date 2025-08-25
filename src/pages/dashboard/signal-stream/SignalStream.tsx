import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Wifi,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EnhancedSignalCard } from "@/components/signals/EnhancedSignalCard";
import { RealtimeConnectionStatus } from "@/components/signals/RealtimeConnectionStatus";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";

export default function SignalStream() {
  const { user } = useAuth();
  const {
    signals,
    subscribe,
    unsubscribe,
    refreshSignals,
    connectionStatus,
    error: rtError,
    lastUpdated,
    nextRetryAt
  } = useSignalRealtime();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "closed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [educatorFilter, setEducatorFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize signal notifications
  const { showNewSignalNotification, requestNotificationPermission } = useSignalNotifications(signals, {
    enableToasts: true,
    enableBrowserNotifications: false,
    soundEnabled: false
  });

  // Ensure realtime subscription is active on this page
  useEffect(() => {
    console.log("[SignalStream] Mount -> subscribing to realtime");
    subscribe();
    return () => {
      console.log("[SignalStream] Unmount -> unsubscribing from realtime");
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  // Initial data load (in case already connected) and basic status logging
  useEffect(() => {
    console.log("[SignalStream] connectionStatus:", connectionStatus, "error:", rtError, "lastUpdated:", lastUpdated);
    // Kick off a refresh so the list is populated immediately on mount
    refreshSignals();
  }, [refreshSignals, connectionStatus, rtError, lastUpdated]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleCreateSignal = () => {
    navigate('/dashboard/new-signal');
  };

  const canCreateSignals = user?.user_metadata?.user_type === "educator" || user?.user_metadata?.access_level === "admin";

  const filteredSignals = signals?.filter(signal => {
    if (!signal) return false;
    
    const searchTermLower = searchTerm.toLowerCase();
    const assetLower = signal.assetName?.toLowerCase() || '';
    const notesLower = signal.notes?.toLowerCase() || '';

    const matchesSearch =
      assetLower.includes(searchTermLower) ||
      notesLower.includes(searchTermLower);

    const matchesStatus = statusFilter === "all" || signal.status === statusFilter;
    const matchesType = typeFilter === "all" || signal.tradeType === typeFilter;
    const matchesEducator = !educatorFilter || signal.userId === educatorFilter;
    const matchesAsset = !assetFilter || signal.assetName === assetFilter;

    // Apply tab filter
    const matchesTab = activeTab === "all" || signal.status === activeTab;

    return matchesSearch && matchesStatus && matchesType && matchesEducator && matchesAsset && matchesTab;
  }) || [];

  const getTabCount = (status: string) => {
    if (status === "all") return signals?.length || 0;
    return signals?.filter(s => s?.status === status).length || 0;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
              Signal Stream
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time trading signals from professional traders
            </p>
          </div>
          
          <RealtimeConnectionStatus 
            status={connectionStatus}
            lastUpdated={lastUpdated}
            nextRetryAt={nextRetryAt}
            className="ml-auto sm:ml-0"
          />
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
                    {getTabCount('active')}
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
                    {getTabCount('pending')}
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
                    {getTabCount('closed')}
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
                  <p className="text-xl font-bold text-foreground">{getTabCount('all')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters and Search */}
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
            All ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Active ({getTabCount('active')})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Pending ({getTabCount('pending')})
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Closed ({getTabCount('closed')})
          </TabsTrigger>
        </TabsList>

        {/* Signal Content - Updated to 3-column grid */}
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSignals && filteredSignals.length > 0 ? (
            <ScrollArea className="h-[800px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      <EnhancedSignalCard 
                        signal={signal}
                        onUpdate={(updatedSignal) => {
                          console.log('Signal updated:', updatedSignal);
                        }}
                        onDelete={(signalId) => {
                          console.log('Signal deleted:', signalId);
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
              {canCreateSignals && (
                <Button 
                  onClick={handleCreateSignal}
                  className="mt-4"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Signal
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
