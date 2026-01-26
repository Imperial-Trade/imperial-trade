import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Send, 
  User,
  Phone,
  Calendar,
  Globe,
  FileText,
  AlertTriangle,
  RefreshCw,
  Filter,
  UserCheck,
  Loader2,
  MoreVertical,
  ChevronDown,
  ExternalLink,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeRequests } from '@/hooks/useRealTimeRequests';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AccountRequest {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  account_type: string;
  vt_market_account_number?: string;
  website?: string;
  referrer?: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  resubmission_count?: number;
  last_resubmitted_at?: string;
}

const REJECTION_TEMPLATES = [
  {
    value: 'incomplete_info',
    label: 'Incomplete Information',
    text: 'Your application lacks required information. Please provide complete details about your trading experience and background.'
  },
  {
    value: 'verification_failed',
    label: 'Verification Failed',
    text: 'We were unable to verify the information provided in your application. Please ensure all details are accurate and up-to-date.'
  },
  {
    value: 'insufficient_experience',
    label: 'Insufficient Experience',
    text: 'Based on your application, you may need more trading experience before joining our community. We encourage you to continue learning and reapply in the future.'
  },
  {
    value: 'invalid_account',
    label: 'Invalid Account Details',
    text: 'The VT Markets account information provided could not be verified. Please check your account details and resubmit.'
  },
  {
    value: 'custom',
    label: 'Custom Reason',
    text: ''
  }
];

export const DirectAccountRequestManagement: React.FC = () => {
  const { requests, loading: dataLoading, loadRequests, clearNewRequestCount } = useRealTimeRequests();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'transitioning' | 'complete'>('loading');
  const { toast } = useToast();

  // Loading phase: 1s loading, then 0.5s transition
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoadingPhase('transitioning');
    }, 1000);
    
    const transitionTimer = setTimeout(() => {
      setLoadingPhase('complete');
    }, 1500);
    
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const loading = dataLoading || loadingPhase === 'loading';
  const isTransitioning = loadingPhase === 'transitioning';

  useEffect(() => {
    clearNewRequestCount();
  }, [clearNewRequestCount]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          label: 'Pending', 
          bg: 'bg-amber-50 dark:bg-amber-500/10', 
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-500/20'
        };
      case 'approved':
        return { 
          icon: CheckCircle, 
          label: 'Approved', 
          bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-500/20'
        };
      case 'rejected':
        return { 
          icon: XCircle, 
          label: 'Rejected', 
          bg: 'bg-red-50 dark:bg-red-500/10', 
          text: 'text-red-600 dark:text-red-400',
          border: 'border-red-200 dark:border-red-500/20'
        };
      default:
        return { 
          icon: Clock, 
          label: status, 
          bg: 'bg-slate-50 dark:bg-slate-500/10', 
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-200 dark:border-slate-500/20'
        };
    }
  };

  const handleApprove = async (request: AccountRequest) => {
    setActionLoading(request.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('unified-account-approval', {
        body: { requestId: request.id, status: 'approved' }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Account approval failed');

      try {
        await supabase.functions.invoke('account-request-notifications', {
          body: { type: 'request_approved', userEmail: request.email, userName: request.full_name }
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
      }

      toast({
        title: "Account Approved",
        description: `${request.full_name}'s account has been approved.`,
        variant: "default"
      });

      loadRequests();
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve account.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: AccountRequest, reason: string) => {
    setActionLoading(request.id);
    try {
      const { error } = await supabase.from('account_requests').update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      }).eq('id', request.id);
      
      if (error) throw error;

      try {
        await supabase.functions.invoke('account-request-notifications', {
          body: { type: 'request_rejected', userEmail: request.email, userName: request.full_name, reason }
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      toast({
        title: "Request Rejected",
        description: `${request.full_name}'s request has been rejected.`,
        variant: "default"
      });

      loadRequests();
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedTemplate('');
      setSelectedRequest(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTemplateChange = (templateValue: string) => {
    setSelectedTemplate(templateValue);
    const template = REJECTION_TEMPLATES.find(t => t.value === templateValue);
    if (template && templateValue !== 'custom') {
      setRejectionReason(template.text);
    } else if (templateValue === 'custom') {
      setRejectionReason('');
    }
  };

  const openRejectionDialog = (request: AccountRequest) => {
    setSelectedRequest(request);
    setRejectionDialogOpen(true);
    setRejectionReason('');
    setSelectedTemplate('');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  if (loading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">Loading Requests</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full pb-24 lg:pb-6 transition-all duration-500 ${
        isTransitioning ? 'blur-sm opacity-90' : 'blur-0 opacity-100'
      }`}
    >
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <UserCheck className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">Account Requests</h1>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                {filteredRequests.length} of {requests.length} requests
                {hasActiveFilters && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    filtered
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                hasActiveFilters 
                  ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={loadRequests}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              onClick={loadRequests}
              variant="outline"
              size="sm"
              className="h-10 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Cards - Modern Glass Design */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6">
          {/* Pending */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/20 dark:via-orange-500/10 p-3 lg:p-4 border border-amber-200/50 dark:border-amber-500/20 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
              <p className="text-[10px] lg:text-xs text-amber-600/70 dark:text-amber-400/70 font-medium mt-0.5">Pending</p>
            </div>
          </div>
          
          {/* Approved */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent dark:from-emerald-500/20 dark:via-green-500/10 p-3 lg:p-4 border border-emerald-200/50 dark:border-emerald-500/20 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
              <p className="text-[10px] lg:text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-0.5">Approved</p>
            </div>
          </div>
          
          {/* Rejected */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent dark:from-red-500/20 dark:via-rose-500/10 p-3 lg:p-4 border border-red-200/50 dark:border-red-500/20 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-bl from-red-400/20 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center mb-2">
                <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
              <p className="text-[10px] lg:text-xs text-red-600/70 dark:text-red-400/70 font-medium mt-0.5">Rejected</p>
            </div>
          </div>
        </div>
        
        {/* Desktop Search and Filters */}
        <div className="hidden lg:flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          {hasActiveFilters && (
            <Button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              variant="ghost"
              size="sm"
              className="h-10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No requests found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'No account requests have been submitted yet.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const statusConfig = getStatusConfig(request.status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = detailsOpen === request.id;
            
            return (
              <Card 
                key={request.id} 
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div className="p-4 lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                      {/* User Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {request.full_name}
                            </h3>
                            {request.resubmission_count && request.resubmission_count > 0 && (
                              <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 text-[10px]">
                                {request.resubmission_count}x
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{request.email}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            {/* Desktop buttons */}
                            <div className="hidden lg:flex items-center gap-2">
                              <Button
                                onClick={() => handleApprove(request)}
                                disabled={actionLoading === request.id}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                              >
                                {actionLoading === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => openRejectionDialog(request)}
                                disabled={actionLoading === request.id}
                                variant="outline"
                                size="sm"
                                className="border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 h-9"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                            
                            {/* Mobile dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild className="lg:hidden">
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleApprove(request)} className="text-emerald-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRejectionDialog(request)} className="text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDetailsOpen(isExpanded ? null : request.id)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  {isExpanded ? 'Hide Details' : 'View Details'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                        
                        {/* Expand/Collapse button */}
                        <button
                          onClick={() => setDetailsOpen(isExpanded ? null : request.id)}
                          className="hidden lg:flex w-9 h-9 rounded-lg items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {request.phone_number && (
                            <div className="flex items-start gap-2">
                              <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                                <p className="text-sm text-slate-900 dark:text-white">{request.phone_number}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Account Type</p>
                              <p className="text-sm text-slate-900 dark:text-white capitalize">{request.account_type}</p>
                            </div>
                          </div>
                          {request.vt_market_account_number && (
                            <div className="flex items-start gap-2">
                              <ExternalLink className="w-4 h-4 text-slate-400 mt-0.5" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">VT Markets Account</p>
                                <p className="text-sm text-slate-900 dark:text-white">{request.vt_market_account_number}</p>
                              </div>
                            </div>
                          )}
                          {request.website && (
                            <div className="flex items-start gap-2">
                              <Globe className="w-4 h-4 text-slate-400 mt-0.5" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Website</p>
                                <p className="text-sm text-slate-900 dark:text-white truncate">{request.website}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {request.reason && (
                          <div className="mt-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Reason for Request</p>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                              <p className="text-sm text-slate-700 dark:text-slate-300">{request.reason}</p>
                            </div>
                          </div>
                        )}
                        
                        {request.rejection_reason && (
                          <div className="mt-4">
                            <p className="text-xs text-red-500 dark:text-red-400 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Rejection Reason
                            </p>
                            <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-200 dark:border-red-500/20">
                              <p className="text-sm text-red-700 dark:text-red-300">{request.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                        
                        {request.status !== 'pending' && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                            <Mail className="w-3 h-3" />
                            <span>Email notification sent to user</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Mobile Action Buttons for Pending */}
                  {request.status === 'pending' && (
                    <div className="lg:hidden flex border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={actionLoading === request.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors border-r border-slate-100 dark:border-slate-800"
                      >
                        {actionLoading === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openRejectionDialog(request)}
                        disabled={actionLoading === request.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 gap-0 rounded-t-3xl rounded-b-none fixed bottom-0 top-auto translate-y-0">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          
          <DialogHeader className="px-6 pb-4">
            <DialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Filters
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-8 space-y-5">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(status.value)}
                    className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                      statusFilter === status.value
                        ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  variant="outline"
                  className="flex-1 h-12 border-slate-200 dark:border-slate-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              Reject Request
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
              Rejecting <strong className="text-slate-900 dark:text-white">{selectedRequest?.full_name}</strong>'s account request. They will be notified via email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rejection Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="mt-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select a template or write custom" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_TEMPLATES.map(template => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rejection Reason</Label>
              <Textarea 
                placeholder="Provide a clear reason for rejection..." 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)} 
                rows={4} 
                className="mt-2 resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setRejectionDialogOpen(false)} 
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => selectedRequest && handleReject(selectedRequest, rejectionReason)} 
                disabled={!rejectionReason.trim() || actionLoading === selectedRequest?.id} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading === selectedRequest?.id ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rejecting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send Rejection</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
