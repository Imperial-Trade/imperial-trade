
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
  Filter, 
  TrendingUp, 
  TrendingDown,
  Users,
  Eye,
  Copy,
  BarChart3,
  Signal,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EducatorAnalytics {
  total_signals: number;
  active_signals: number;
  closed_signals: number;
  total_followers: number;
  total_views: number;
  total_copies: number;
  avg_success_rate: number;
  avg_performance_score: number;
}

export default function EducatorTradeSignalsPage() {
  const { user } = useAuth();
  const tradingData = useOptimizedTrading();
  const { alerts } = tradingData;
  const [analytics, setAnalytics] = useState<EducatorAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load educator analytics using RPC call
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user?.id) return;

      try {
        // Simulate analytics data since RPC functions aren't created yet
        const mockAnalytics: EducatorAnalytics = {
          total_signals: alerts.length,
          active_signals: alerts.filter(a => a.status === 'active').length,
          closed_signals: alerts.filter(a => a.status === 'closed').length,
          total_followers: 0,
          total_views: 0,
          total_copies: 0,
          avg_success_rate: 0.75,
          avg_performance_score: 85
        };

        setAnalytics(mockAnalytics);
        setLoading(false);
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user?.id, alerts]);

  // Filter alerts based on search and status
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.finnhubSymbol.toLowerCase().includes(searchTerm.toLowerCase());
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
    
    const isProfit = alert.tpHits.length > 0;
    return (
      <Badge className={isProfit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
        {isProfit ? 'TP REACHED' : 'CLOSED'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Trade Signal Management</h1>
            <p className="text-secondary">Manage and track your professional trading signals</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-accent-green hover:bg-accent-green/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Signal
          </Button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-effect border-default">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Total Signals</p>
                    <p className="text-2xl font-bold text-primary">{analytics.total_signals}</p>
                  </div>
                  <Signal className="w-8 h-8 text-accent-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-default">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Followers</p>
                    <p className="text-2xl font-bold text-primary">{analytics.total_followers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-default">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Success Rate</p>
                    <p className="text-2xl font-bold text-primary">{(analytics.avg_success_rate * 100).toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-default">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Total Views</p>
                    <p className="text-2xl font-bold text-primary">{analytics.total_views}</p>
                  </div>
                  <Eye className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Search and Filter Controls */}
      <Card className="glass-effect border-default">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
              <Input
                placeholder="Search signals by asset name or symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-default text-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-surface border border-default rounded-md text-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-surface border-default">
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
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-effect border-default hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-primary">{alert.assetName}</h3>
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
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-secondary">Entry Price</p>
                          <p className="font-semibold text-primary">${alert.entryPrice}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-secondary">Stop Loss</p>
                          <p className="font-semibold text-red-400">${alert.stopLoss}</p>
                        </div>
                        {alert.tp1 && (
                          <div className="text-right">
                            <p className="text-sm text-secondary">TP1</p>
                            <p className="font-semibold text-green-400">${alert.tp1}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {alert.notes && (
                      <div className="mt-4 p-3 bg-surface/50 rounded-lg">
                        <p className="text-sm text-secondary">{alert.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/20">
                      <div className="flex items-center gap-4 text-sm text-secondary">
                        <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Updated {new Date(alert.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAlerts.length === 0 && (
            <Card className="glass-effect border-default">
              <CardContent className="p-8 text-center">
                <Signal className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Signals Found
                </h3>
                <p className="text-secondary mb-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No signals match your search criteria.' 
                    : 'Start creating professional trading signals for your followers.'}
                </p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-accent-green hover:bg-accent-green/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Signal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active">
          {/* Similar content filtered for active signals */}
        </TabsContent>

        <TabsContent value="closed">
          {/* Similar content filtered for closed signals */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
