
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Filter, Search } from 'lucide-react';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { useAuth } from '@/contexts/AuthContext';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export default function AdminTradeSignalsTab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch all signals for admin view
  const {
    alerts,
    isLoading,
    error,
    updateAlert,
    deleteAlert
  } = useOptimizedTrading(user?.id || '', true);

  // Filter and search logic
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = !searchTerm || 
        alert.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.tradermadeSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      const matchesType = typeFilter === 'all' || alert.tradeType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [alerts, searchTerm, statusFilter, typeFilter]);

  // Signal statistics
  const stats = useMemo(() => {
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      pending: alerts.filter(a => a.status === 'pending').length,
      closed: alerts.filter(a => a.status === 'closed').length,
      partiallyProfited: alerts.filter(a => a.status === 'partially_profited').length
    };
  }, [alerts]);

  const handleStatusUpdate = async (alertId: string, newStatus: 'pending' | 'active' | 'closed' | 'partially_profited') => {
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus,
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      await updateAlert(alertId, updateDto);
    } catch (error) {
      console.error('Failed to update signal status:', error);
    }
  };

  const handleCloseWithReason = async (alertId: string, closeReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp') => {
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: 'closed',
        closeReason: closeReason
      };
      await updateAlert(alertId, updateDto);
    } catch (error) {
      console.error('Failed to close signal:', error);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (confirm('Are you sure you want to delete this signal? This action cannot be undone.')) {
      try {
        await deleteAlert(alertId);
      } catch (error) {
        console.error('Failed to delete signal:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <TrendingUp className="h-3 w-3 mr-1" />
          Active
        </Badge>;
      case 'partially_profited':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <TrendingUp className="h-3 w-3 mr-1" />
          Partially Profited
        </Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Closed
        </Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading signals: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Signals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-orange-600">{stats.partiallyProfited}</div>
            <p className="text-xs text-muted-foreground">Partially Profited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">Closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search assets, symbols, or educators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="partially_profited">Partially Profited</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Trade Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="buy_limit">Buy Limit</SelectItem>
                  <SelectItem value="sell_limit">Sell Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No signals found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {alert.tradeType.includes('buy') ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <CardTitle className="text-lg">{alert.assetName}</CardTitle>
                    </div>
                    {getStatusBadge(alert.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    by {alert.creator?.display_name || 'Unknown'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Trade Type</Label>
                    <div className="font-medium">{alert.tradeType.toUpperCase()}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entry Price</Label>
                    <div className="font-medium">${alert.entryPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Stop Loss</Label>
                    <div className="font-medium">${alert.stopLoss.toFixed(4)}</div>
                  </div>
                  {alert.tp1 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Take Profits</Label>
                      <div className="text-sm">
                        {[alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5]
                          .filter(Boolean)
                          .map((tp, idx) => (
                            <span key={idx} className="mr-2">
                              TP{idx + 1}: ${tp!.toFixed(4)}
                              {alert.tpHits?.includes(idx + 1) && (
                                <CheckCircle2 className="inline h-3 w-3 ml-1 text-green-600" />
                              )}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <div className="text-sm">{new Date(alert.createdAt).toLocaleString()}</div>
                  </div>
                  {alert.closeReason && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Close Reason</Label>
                      <div className="text-sm">{alert.closeReason.replace('_', ' ').toUpperCase()}</div>
                    </div>
                  )}
                </div>

                {alert.notes && (
                  <div className="mb-4">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <div className="text-sm bg-muted p-2 rounded-md">{alert.notes}</div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-2">
                  {alert.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(alert.id, 'active')}
                    >
                      Activate
                    </Button>
                  )}
                  
                  {(alert.status === 'active' || alert.status === 'partially_profited') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusUpdate(alert.id, 'partially_profited')}
                      >
                        Mark Partial Profit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCloseWithReason(alert.id, 'manual' as const)}
                      >
                        Close Manual
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCloseWithReason(alert.id, 'stop_loss' as const)}
                      >
                        Close SL Hit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCloseWithReason(alert.id, 'all_tps_hit' as const)}
                      >
                        Close All TPs Hit
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDelete(alert.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
