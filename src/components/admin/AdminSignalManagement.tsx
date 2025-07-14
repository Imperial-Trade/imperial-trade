import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Users,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Signal,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminSignalAnalytics {
  total_signals: number;
  active_signals: number;
  closed_signals: number;
  success_rate: number;
  total_educators: number;
  recent_activity: number;
}

export function AdminSignalManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { alerts, isLoading, refreshAlerts } = useOptimizedTrading('', true); // All signals
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AdminSignalAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Fetch admin analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        
        // Get signal statistics
        const { data: signalStats, error: signalError } = await supabase
          .from('trade_alerts')
          .select('status, user_id, tp_hits, created_at')
          .order('created_at', { ascending: false });

        if (signalError) throw signalError;

        // Get unique educators count
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_type, access_level, display_name')
          .or('user_type.eq.educator,access_level.eq.admin');

        if (profileError) throw profileError;

        const totalSignals = signalStats?.length || 0;
        const activeSignals = signalStats?.filter(s => s.status === 'active').length || 0;
        const closedSignals = signalStats?.filter(s => s.status === 'closed').length || 0;
        const successfulSignals = signalStats?.filter(s => s.status === 'closed' && s.tp_hits?.length > 0).length || 0;
        const successRate = closedSignals > 0 ? (successfulSignals / closedSignals) : 0;
        const totalEducators = profiles?.length || 0;

        // Recent activity (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentActivity = signalStats?.filter(s => 
          new Date(s.created_at) > yesterday
        ).length || 0;

        setAnalytics({
          total_signals: totalSignals,
          active_signals: activeSignals,
          closed_signals: closedSignals,
          success_rate: successRate,
          total_educators: totalEducators,
          recent_activity: recentActivity
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive"
        });
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [toast]);

  // Filter alerts based on search and status
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.finnhubSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [alerts, searchTerm, filterStatus]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Clock },
      closed: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle },
      pending: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock }
    };
    
    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPerformanceBadge = (alert: any) => {
    if (alert.status !== 'closed') return null;
    
    const isProfit = alert.tpHits?.length > 0;
    return (
      <Badge className={isProfit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
        {isProfit ? 'TP REACHED' : 'STOP LOSS'}
      </Badge>
    );
  };

  const handleDeleteSignal = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this signal? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signal deleted successfully",
      });

      refreshAlerts();
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast({
        title: "Error",
        description: "Failed to delete signal",
        variant: "destructive"
      });
    }
  };

  if (isLoading || loadingAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Admin Signal Management
            </h2>
            <p className="text-muted-foreground">Oversee all trading signals from educators and admins</p>
          </div>
          <Button
            onClick={() => window.open('/dashboard/new-signal', '_blank')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Admin Signal
          </Button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Signals</p>
                    <p className="text-2xl font-bold">{analytics.total_signals}</p>
                  </div>
                  <Signal className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-400">{analytics.active_signals}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Closed</p>
                    <p className="text-2xl font-bold text-blue-400">{analytics.closed_signals}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-green-400">{(analytics.success_rate * 100).toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Educators</p>
                    <p className="text-2xl font-bold text-purple-400">{analytics.total_educators}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">24h Activity</p>
                    <p className="text-2xl font-bold text-orange-400">{analytics.recent_activity}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search signals by asset, symbol, or educator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-background border border-input rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
              <Button
                onClick={refreshAlerts}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Signals ({filteredAlerts.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({filteredAlerts.filter(a => a.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({filteredAlerts.filter(a => a.status === 'closed').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{alert.assetName}</h3>
                            <Badge variant="outline" className="text-xs">
                              {alert.finnhubSymbol}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(alert.status)}
                            {getPerformanceBadge(alert)}
                            <Badge className={alert.tradeType.includes('buy') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                              {alert.tradeType === 'buy' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                              {alert.tradeType.toUpperCase()}
                            </Badge>
                            {alert.creator && (
                              <Badge variant="secondary" className="text-xs">
                                by {alert.creator.display_name || 'Unknown'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Entry Price</p>
                          <p className="font-semibold">${alert.entryPrice}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Stop Loss</p>
                          <p className="font-semibold text-red-400">${alert.stopLoss}</p>
                        </div>
                        {alert.tp1 && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">TP1</p>
                            <p className="font-semibold text-green-400">${alert.tp1}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {alert.notes && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">{alert.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Updated {new Date(alert.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteSignal(alert.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAlerts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Signal className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Signals Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No signals match your search criteria.' 
                    : 'No trading signals have been created yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active">
          {/* Active signals would be filtered here */}
        </TabsContent>

        <TabsContent value="closed">
          {/* Closed signals would be filtered here */}
        </TabsContent>
      </Tabs>
    </div>
  );
}