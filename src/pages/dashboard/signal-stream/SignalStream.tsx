import React, { useState, useEffect } from "react";
import { useSignalRealtime } from "@/contexts/SignalRealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  User,
  Filter,
  Search,
  Plus,
  Radio,
  Target,
  AlertCircle,
} from "lucide-react";
// import { SignalCard } from "./components/SignalCard";
// import { SignalFilters } from "./components/SignalFilters";
// import { CreateSignalDialog } from "./components/CreateSignalDialog";
import { motion, AnimatePresence } from "framer-motion";

interface Signal {
  id: string;
  asset: string;
  type: 'buy' | 'sell';
  entry: number;
  takeProfit: number;
  stopLoss: number;
  leverage: number;
  timestamp: string;
  educatorId: string;
  notes: string;
  status: 'active' | 'pending' | 'closed';
}

interface UserMetadata {
  user_type?: 'admin' | 'educator' | 'member';
  access_level?: 'admin' | 'educator' | 'member';
}

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
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "closed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [educatorFilter, setEducatorFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleCreateSignal = async (signalData: Omit<Signal, 'id'>) => {
    setIsSubmitting(true);
    try {
      // await createSignal(signalData);
      toast.success("Signal created successfully!");
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Failed to create signal:", error);
      toast.error("Failed to create signal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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

    return matchesSearch && matchesStatus && matchesType && matchesEducator && matchesAsset;
  }) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-pulse" />
            Signal Stream
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time trading signals from professional traders
          </p>
        </div>

        {canCreateSignals && (
          <Button 
            onClick={() => setShowCreateDialog(true)}
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

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card className="border-border/50" data-prevent-widget-open="true">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Advanced filters coming soon...</div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "pending" | "closed")} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50" data-prevent-widget-open="true">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All ({filteredSignals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active ({filteredSignals?.filter(s => s?.status === 'active').length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending ({filteredSignals?.filter(s => s?.status === 'pending').length || 0})
            </TabsTrigger>
            <TabsTrigger value="closed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Closed ({filteredSignals?.filter(s => s?.status === 'closed').length || 0})
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
                        <Card className="border-border/50 hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{signal.assetName}</h3>
                              <p className="text-sm text-muted-foreground">{signal.tradeType?.toUpperCase()}</p>
                              <Badge variant={signal.status === 'active' ? 'default' : signal.status === 'pending' ? 'secondary' : 'outline'}>
                                {signal.status}
                              </Badge>
                            </div>
                            </div>
                          </CardContent>
                        </Card>
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

      {/* Create Signal Dialog - Coming Soon */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Create Signal</h3>
              <p className="text-muted-foreground mb-4">Signal creation feature coming soon!</p>
              <Button onClick={() => setShowCreateDialog(false)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
