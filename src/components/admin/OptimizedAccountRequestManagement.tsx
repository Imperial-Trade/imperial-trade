import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  X, 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Phone,
  Shield,
  Calendar,
  Settings
} from 'lucide-react';
import { AuditLog } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfessionalButton } from '@/components/ui/professional-button';
import { ProfessionalToast } from '@/components/ui/professional-toast';
import { useProfessionalToast } from '@/hooks/useProfessionalToast';
import { useRealTimeRequests } from '@/hooks/useRealTimeRequests';
import { useOptimizedFiltering } from '@/hooks/useOptimizedFiltering';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { useOptimizedRetry } from '@/hooks/useOptimizedRetry';

export const OptimizedAccountRequestManagement: React.FC = () => {
  const { requests, newRequestCount, loading, loadRequests, clearNewRequestCount } = useRealTimeRequests();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [resubmissionFilter, setResubmissionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { searchTerm, debouncedSearchTerm, handleSearchChange, clearSearch, isSearching } = useOptimizedSearch('', {
    delay: 300,
    minLength: 1
  });

  const { toasts, success, error: showError, celebrate, withProgress, updateToast, removeToast } = useProfessionalToast();

  const filterOptions = useMemo(() => ({
    statusFilter,
    searchTerm: debouncedSearchTerm,
    resubmissionFilter,
    sortBy,
    sortOrder
  }), [statusFilter, debouncedSearchTerm, resubmissionFilter, sortBy, sortOrder]);

  const { filteredRequests, stats } = useOptimizedFiltering(requests, filterOptions);

  // Optimized approval with retry logic
  const { execute: executeApproval } = useOptimizedRetry(
    async (requestId: string, userEmail: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('account-approval', {
        body: {
          requestId: requestId,
          status: 'approved'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to approve account request');
      }

      await AuditLog.create({
        action: "approve_account_request",
        admin_email: user?.email || "admin",
        target_entity: "account_requests",
        target_id: requestId,
        details: { 
          user_email: userEmail,
          user_created: true 
        }
      });

      return data;
    },
    {
      maxAttempts: 3,
      initialDelay: 1000
    }
  );

  // Optimized rejection with retry logic
  const { execute: executeRejection } = useOptimizedRetry(
    async (requestId: string, userEmail: string, reason: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('account-approval', {
        body: {
          requestId: requestId,
          status: 'rejected',
          rejectionReason: reason
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to reject account request');
      }

      await AuditLog.create({
        action: "reject_account_request",
        admin_email: user?.email || "admin",
        target_entity: "account_requests",
        target_id: requestId,
        details: { 
          user_email: userEmail,
          rejection_reason: reason
        }
      });

      return data;
    },
    {
      maxAttempts: 3,
      initialDelay: 1000
    }
  );

  const handleApprove = useCallback(async (requestId: string, userEmail: string) => {
    setActionLoading(requestId);
    
    const progressToastId = withProgress(
      "Approving Account",
      "Creating user account and setting up profile..."
    );

    try {
      updateToast(progressToastId, { progress: 25 });
      
      await executeApproval(requestId, userEmail);

      updateToast(progressToastId, { 
        progress: 75,
        title: "Almost Done",
        description: "Finalizing account setup..."
      });

      updateToast(progressToastId, { progress: 100 });
      
      setTimeout(() => {
        removeToast(progressToastId);
        celebrate(
          "Account Approved! 🎉",
          `${userEmail} has been approved and can now access the platform.`
        );
      }, 500);

      setActionSuccess(requestId);
      setTimeout(() => setActionSuccess(null), 2000);

    } catch (error) {
      console.error("Error approving request:", error);
      removeToast(progressToastId);
      showError(
        "Approval Failed",
        error instanceof Error ? error.message : "Failed to approve account request. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  }, [executeApproval, withProgress, updateToast, removeToast, celebrate, showError]);

  const handleReject = useCallback(async (requestId: string, userEmail: string) => {
    if (!rejectionReason.trim()) {
      showError("Rejection Reason Required", "Please provide a reason for rejection before proceeding.");
      return;
    }

    setActionLoading(requestId);
    
    const progressToastId = withProgress(
      "Rejecting Request",
      "Processing rejection and sending notification..."
    );

    try {
      updateToast(progressToastId, { progress: 50 });
      
      await executeRejection(requestId, userEmail, rejectionReason);

      updateToast(progressToastId, { progress: 100 });

      setTimeout(() => {
        removeToast(progressToastId);
        success(
          "Request Rejected",
          `${userEmail}'s request has been rejected and they have been notified.`
        );
      }, 500);

      setActionSuccess(requestId);
      setTimeout(() => setActionSuccess(null), 2000);

      setRejectionReason("");
      setShowRejectForm(null);
    } catch (error) {
      console.error("Error rejecting request:", error);
      removeToast(progressToastId);
      showError(
        "Rejection Failed",
        error instanceof Error ? error.message : "Failed to reject account request. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  }, [rejectionReason, executeRejection, withProgress, updateToast, removeToast, success, showError]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    clearSearch();
    setResubmissionFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  }, [clearSearch]);

  const handleExportRequests = useCallback(() => {
    const headers = ['Email', 'Full Name', 'Status', 'Account Type', 'VT Account', 'Created At', 'Resubmission Count'];
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.email,
        `"${request.full_name}"`,
        request.status,
        request.account_type,
        request.vt_market_account_number || '',
        new Date(request.created_at).toLocaleDateString(),
        request.resubmission_count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredRequests]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-medium"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-medium"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-medium"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border font-medium">Unknown</Badge>;
    }
  }, []);

  const hasActiveFilters = statusFilter !== 'all' || debouncedSearchTerm !== '' || resubmissionFilter !== 'all';

  if (loading && !requests.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Account Request Management</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading account requests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Account Request Management</h2>
            <p className="text-muted-foreground mt-1">Review and manage account requests with advanced filtering</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportRequests}
              disabled={filteredRequests.length === 0}
              className="hover:bg-accent"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={loadRequests}
              className="hover:bg-accent"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Settings className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by email, name, or VT account..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 bg-background border-border focus:border-ring"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={resubmissionFilter} onValueChange={setResubmissionFilter}>
                  <SelectTrigger className="w-40 bg-background border-border">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="original">Original Only</SelectItem>
                    <SelectItem value="resubmitted">Resubmitted Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created</SelectItem>
                    <SelectItem value="updated_at">Updated</SelectItem>
                    <SelectItem value="full_name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="hover:bg-accent"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium">
                  Showing {filteredRequests.length} of {requests.length} requests
                </span>
                
                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Filter className="w-3 h-3 mr-1" />
                      Filtered
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request List */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Account Requests</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? "No requests match your current filters. Try adjusting your search criteria."
                  : "There are currently no account requests to review."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-foreground flex items-center gap-2 font-semibold">
                          <User className="w-5 h-5 text-muted-foreground" />
                          {request.full_name}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Email:</span>
                            <span className="text-foreground">{request.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Phone:</span>
                            <span className="text-foreground">{request.phone_number || "Not provided"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">VT Account:</span>
                            <span className="text-foreground">{request.vt_market_account_number}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Type:</span>
                            <span className="text-foreground">
                              {request.account_type === "user" ? "Standard Member" : "Educator / IB Partner"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Submitted:</span>
                            <span className="text-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {request.resubmission_count > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <RefreshCw className="w-4 h-4 text-orange-500" />
                              <span className="text-muted-foreground font-medium">Resubmissions:</span>
                              <span className="text-orange-600 font-medium">{request.resubmission_count}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {request.reason && (
                        <div className="bg-muted p-3 rounded-lg border">
                          <h4 className="font-semibold text-foreground mb-2">Reason for Joining:</h4>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {request.reason}
                          </p>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Rejection Reason:</h4>
                          <p className="text-red-600 dark:text-red-300 text-sm leading-relaxed">
                            {request.rejection_reason}
                          </p>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 pt-4 border-t"
                        >
                          <ProfessionalButton
                            onClick={() => handleApprove(request.id, request.email)}
                            isLoading={actionLoading === request.id}
                            isSuccess={actionSuccess === request.id}
                            loadingText="Approving..."
                            successText="Approved!"
                            className="bg-green-600 hover:bg-green-700 text-white font-medium"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </ProfessionalButton>
                          
                          <ProfessionalButton
                            onClick={() => setShowRejectForm(request.id)}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </ProfessionalButton>
                        </motion.div>
                      )}

                      <AnimatePresence>
                        {showRejectForm === request.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t pt-4 space-y-3"
                          >
                            <Textarea
                              placeholder="Please provide a reason for rejection..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="bg-background border focus:border-ring"
                            />
                            <div className="flex gap-2">
                              <ProfessionalButton
                                onClick={() => handleReject(request.id, request.email)}
                                isLoading={actionLoading === request.id}
                                isSuccess={actionSuccess === request.id}
                                disabled={!rejectionReason.trim()}
                                loadingText="Rejecting..."
                                successText="Rejected!"
                                className="bg-red-600 hover:bg-red-700 text-white font-medium"
                              >
                                Confirm Rejection
                              </ProfessionalButton>
                              
                              <ProfessionalButton
                                onClick={() => {
                                  setShowRejectForm(null);
                                  setRejectionReason("");
                                }}
                                variant="outline"
                                className="hover:bg-accent font-medium"
                              >
                                Cancel
                              </ProfessionalButton>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {toasts.map(toast => (
        <ProfessionalToast
          key={toast.id}
          {...toast}
          isVisible={true}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};
