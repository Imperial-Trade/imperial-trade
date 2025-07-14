import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { useEducatorSignals } from '@/hooks/useEducatorSignals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import EditSignalForm from '@/components/signals/EditSignalForm';

import { supabase } from '@/integrations/supabase/client';
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
  XCircle,
  Edit,
  Trash2,
  MoreVertical,
  Share2
} from 'lucide-react';

export default function EducatorSignalManagement() {
  const { user } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('EducatorSignalManagement - User state:', {
      userId: user?.id,
      isAuthenticated: !!user,
      userMetadata: user?.user_metadata
    });
    
    // Check user's profile from the database
    if (user?.id) {
      const checkProfile = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('EducatorSignalManagement - User profile:', { profile, error });
      };
      checkProfile();
    }
  }, [user]);

  // Only initialize hooks after user is authenticated - now using false to get all signals then filter
  const { alerts: allAlerts, isLoading: tradingLoading, createAlert, updateAlert, deleteAlert, error, connectionStatus } = useOptimizedTrading(user?.id || '', false);
  const { analytics, loading: analyticsLoading } = useEducatorSignals();
  const { toast } = useToast();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [deletingAlert, setDeletingAlert] = useState<any>(null);

  const loading = tradingLoading || analyticsLoading;

  // Filter alerts to show only the current educator's own signals
  const userAlerts = useMemo(() => {
    if (!user?.id || !allAlerts) return [];
    return allAlerts.filter(alert => alert.userId === user.id);
  }, [allAlerts, user?.id]);

  // Debug logging for alerts
  useEffect(() => {
    console.log('EducatorSignalManagement - Alerts state:', {
      allAlertsCount: allAlerts.length,
      userAlertsCount: userAlerts.length,
      userId: user?.id,
      connectionStatus,
      error,
      loading
    });
  }, [allAlerts, userAlerts, connectionStatus, error, loading, user?.id]);

  // CRUD Handlers
  const handleCreateSignal = async (data: any) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please ensure you are logged in to create a signal.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating signal with form data:', data);
      
      // Transform form data to DTO format (camelCase)
      const createDto = {
        assetName: data.asset_name,
        finnhubSymbol: data.finnhub_symbol,
        tradeType: data.trade_type,
        entryPrice: data.entry_price,
        stopLoss: data.stop_loss,
        tp1: data.tp1,
        tp2: data.tp2,
        tp3: data.tp3,
        tp4: data.tp4,
        tp5: data.tp5,
        notes: data.notes || ''
      };
      
      console.log('Creating signal with DTO:', createDto);
      const result = await createAlert(createDto);
      console.log('Signal creation result:', result);
      
      if (result) {
        setShowCreateForm(false);
        toast({
          title: "Signal Created",
          description: "Your trading signal has been created successfully.",
        });
      } else {
        throw new Error('Failed to create signal');
      }
    } catch (error) {
      console.error('Error creating signal:', error);
      toast({
        title: "Error",
        description: "Failed to create signal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditSignal = async (data: any) => {
    if (!editingAlert) return;
    
    try {
      console.log('Updating signal with data:', data);
      const result = await updateAlert(editingAlert.id, data);
      console.log('Signal update result:', result);
      
      if (result) {
        setEditingAlert(null);
        toast({
          title: "Signal Updated",
          description: "Your trading signal has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update signal');
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      toast({
        title: "Error",
        description: "Failed to update signal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSignal = async () => {
    if (!deletingAlert) return;
    
    try {
      console.log('Deleting signal:', deletingAlert.id);
      const result = await deleteAlert(deletingAlert.id);
      console.log('Signal deletion result:', result);
      
      if (result) {
        setDeletingAlert(null);
        toast({
          title: "Signal Deleted",
          description: "Your trading signal has been deleted successfully.",
        });
      } else {
        throw new Error('Failed to delete signal');
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast({
        title: "Error",
        description: "Failed to delete signal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopySignal = (alert: any) => {
    const signalText = `📊 ${alert.assetName} (${alert.finnhubSymbol})
🔄 ${alert.tradeType.toUpperCase()}
💰 Entry: $${alert.entryPrice}
❌ Stop Loss: $${alert.stopLoss}
${alert.tp1 ? `✅ TP1: $${alert.tp1}` : ''}
${alert.notes ? `📝 ${alert.notes}` : ''}`;
    
    navigator.clipboard.writeText(signalText);
    toast({
      title: "Signal Copied",
      description: "Signal details have been copied to clipboard.",
    });
  };

  // Filter alerts based on search and status - now using userAlerts instead of alerts
  const filteredAlerts = useMemo(() => {
    return userAlerts.filter(alert => {
      const matchesSearch = alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.finnhubSymbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [userAlerts, searchTerm, filterStatus]);

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

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-secondary mb-2">Please log in to access Signal Management</p>
          <p className="text-sm text-secondary">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full"
        />
        <div className="ml-4 text-center">
          <p className="text-secondary">Loading your signals...</p>
          <p className="text-xs text-secondary">Connection: {connectionStatus || 'connecting'}</p>
        </div>
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
            <h1 className="text-3xl font-bold text-primary">Signal Management</h1>
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
                    <p className="text-2xl font-bold text-primary">{userAlerts.length}</p>
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
                placeholder="Search your signals by asset name or symbol..."
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
          <TabsTrigger value="all">My Signals ({filteredAlerts.length})</TabsTrigger>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopySignal(alert)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border-default">
                            <DropdownMenuItem onClick={() => setEditingAlert(alert)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletingAlert(alert)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

        <TabsContent value="active" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.filter(alert => alert.status === 'active').map((alert, index) => (
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopySignal(alert)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border-default">
                            <DropdownMenuItem onClick={() => setEditingAlert(alert)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletingAlert(alert)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share Signal
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAlerts.filter(alert => alert.status === 'active').length === 0 && (
            <Card className="glass-effect border-default">
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Active Signals
                </h3>
                <p className="text-secondary mb-4">
                  You don't have any active trading signals at the moment.
                </p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-accent-green hover:bg-accent-green/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Active Signal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.filter(alert => alert.status === 'closed').map((alert, index) => (
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopySignal(alert)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border-default">
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share Performance
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Performance Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAlerts.filter(alert => alert.status === 'closed').length === 0 && (
            <Card className="glass-effect border-default">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Closed Signals
                </h3>
                <p className="text-secondary mb-4">
                  You don't have any closed trading signals yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Create Signal Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-default">
          <DialogHeader>
            <DialogTitle className="text-primary">Create New Trading Signal</DialogTitle>
          </DialogHeader>
          <OptimizedNewAlertForm 
            onSubmit={handleCreateSignal}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Signal Modal */}
      <Dialog open={!!editingAlert} onOpenChange={(open) => !open && setEditingAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-default">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit Trading Signal</DialogTitle>
          </DialogHeader>
          {editingAlert && (
            <EditSignalForm 
              alert={editingAlert}
              onSubmit={handleEditSignal}
              onCancel={() => setEditingAlert(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deletingAlert} onOpenChange={(open) => !open && setDeletingAlert(null)}>
        <AlertDialogContent className="bg-surface border-default">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Delete Trading Signal</AlertDialogTitle>
            <AlertDialogDescription className="text-secondary">
              Are you sure you want to delete this trading signal for{" "}
              <span className="font-semibold text-primary">
                {deletingAlert?.assetName} ({deletingAlert?.finnhubSymbol})
              </span>?
              This action cannot be undone and will remove the signal from all your followers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface border-default text-secondary hover:bg-secondary/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSignal}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Signal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
