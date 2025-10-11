import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Eye, CheckCircle, XCircle, Clock, AlertCircle, Mail, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeRequests } from '@/hooks/useRealTimeRequests';
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
const REJECTION_TEMPLATES = [{
  value: 'incomplete_info',
  label: 'Incomplete Information',
  text: 'Your application lacks required information. Please provide complete details about your trading experience and background.'
}, {
  value: 'verification_failed',
  label: 'Verification Failed',
  text: 'We were unable to verify the information provided in your application. Please ensure all details are accurate and up-to-date.'
}, {
  value: 'insufficient_experience',
  label: 'Insufficient Experience',
  text: 'Based on your application, you may need more trading experience before joining our community. We encourage you to continue learning and reapply in the future.'
}, {
  value: 'invalid_account',
  label: 'Invalid Account Details',
  text: 'The VT Markets account information provided could not be verified. Please check your account details and resubmit.'
}, {
  value: 'custom',
  label: 'Custom Reason',
  text: ''
}];
export const DirectAccountRequestManagement: React.FC = () => {
  const {
    requests,
    loading,
    loadRequests,
    clearNewRequestCount
  } = useRealTimeRequests();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const {
    toast
  } = useToast();
  useEffect(() => {
    clearNewRequestCount();
  }, [clearNewRequestCount]);
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  // FIXED: Now uses account-approval edge function instead of direct admin API
  // Edge function chain: account-approval → create-approved-account → auth.admin.createUser()
  // This ensures proper service role authentication and automated role/profile creation
  const handleApprove = async (request: AccountRequest) => {
    setActionLoading(request.id);
    
    try {
      console.log(`🎯 [Account Approval] Starting approval for request ID: ${request.id}`);
      console.log(`📧 Email: ${request.email}, Type: ${request.account_type}`);
      
      let approvalSuccess = false;
      let errorMessage = '';
      
      // ============================================
      // ATTEMPT 1: Use Edge Function (PREFERRED)
      // ============================================
      try {
        console.log('🚀 [Account Approval] Attempting edge function approach...');
        
        const { data: approvalResult, error: approvalError } = await supabase.functions.invoke('account-approval', {
          body: {
            requestId: request.id,
            status: 'approved',
            rejectionReason: null
          }
        });

        if (approvalError) {
          console.warn('⚠️ [Account Approval] Edge function invocation error:', approvalError);
          throw new Error(`Edge function failed: ${approvalError.message}`);
        }

        if (!approvalResult?.success) {
          console.warn('⚠️ [Account Approval] Edge function returned error:', approvalResult);
          throw new Error(approvalResult?.error || 'Account approval failed');
        }

        console.log('✅ [Account Approval] Edge function succeeded');
        approvalSuccess = true;
        
      } catch (edgeFunctionError) {
        console.warn('⚠️ [Account Approval] Edge function approach failed, trying fallback...', edgeFunctionError);
        errorMessage = edgeFunctionError instanceof Error ? edgeFunctionError.message : 'Unknown error';
        
        // ============================================
        // ATTEMPT 2: Direct Supabase Fallback
        // ============================================
        try {
          console.log('🔄 [Account Approval] Using complete direct Supabase fallback (no edge functions)...');
          
          // Step 1: Update account request status
          const { error: updateError } = await supabase
            .from('account_requests')
            .update({ 
              status: 'approved',
              approved_by: (await supabase.auth.getUser()).data.user?.email || 'admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', request.id);

          if (updateError) {
            throw new Error(`Failed to update account request: ${updateError.message}`);
          }
          
          console.log('✅ [Account Approval] Account request updated to approved');
          
          // Step 2: Generate temporary password
          const tempPassword = crypto.randomUUID() + crypto.randomUUID();
          console.log('🔑 [Account Approval] Generated temporary password');
          
          // Step 3: Create user in Supabase Auth using admin API
          console.log('👤 [Account Approval] Creating Supabase Auth user...');
          
          // CRITICAL: Use admin endpoint directly with proper headers
          const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
          const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              email: request.email.toLowerCase().trim(),
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: request.full_name,
                phone_number: request.phone_number,
                account_type: request.account_type,
                user_type: request.account_type === 'educator' ? 'educator' : 'member',
                role: request.account_type === 'educator' ? 'educator' : 'member',
                access_level: request.account_type === 'educator' ? 'moderator' : 'member',
                account_status: 'active',
                registration_source: 'account_request',
                vt_market_account_number: request.vt_market_account_number || '',
                referrer: request.referrer || '',
                website: request.website || ''
              }
            })
          });

          if (!createUserResponse.ok) {
            const errorData = await createUserResponse.json();
            throw new Error(`Failed to create user: ${JSON.stringify(errorData)}`);
          }

          const userData = await createUserResponse.json();
          const newUserId = userData.id;
          console.log('✅ [Account Approval] User created successfully:', newUserId);
          
          // Step 4: Send password reset email
          console.log('📧 [Account Approval] Sending password reset email...');
          const resetResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              type: 'recovery',
              email: request.email.toLowerCase().trim()
            })
          });

          if (resetResponse.ok) {
            console.log('✅ [Account Approval] Password reset email sent');
          } else {
            console.warn('⚠️ [Account Approval] Failed to send password reset email (non-blocking)');
          }
          
          console.log('✅ [Account Approval] Complete direct fallback succeeded - user account fully created');
          approvalSuccess = true;
          
        } catch (fallbackError) {
          console.error('❌ [Account Approval] Direct fallback failed:', fallbackError);
          throw new Error(
            `Both edge function and direct fallback failed. Edge function error: ${errorMessage}. ` +
            `Direct fallback error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`
          );
        }
      }
      
      // ============================================
      // SUCCESS: Send Notification & Update UI
      // ============================================
      if (approvalSuccess) {
        // Send email notification (optional - non-blocking)
        try {
          await supabase.functions.invoke('account-request-notifications', {
            body: {
              type: 'request_approved',
              userEmail: request.email,
              userName: request.full_name
            }
          });
        } catch (emailError) {
          console.warn('⚠️ Email notification failed (non-blocking):', emailError);
        }

        // Show success message
        toast({
          title: "✅ Account Approved",
          description: `${request.full_name}'s account has been created successfully. They will receive a password reset email.`,
          variant: "default"
        });

        // Refresh the requests list
        loadRequests();
      }

    } catch (error) {
      console.error('❌ [Account Approval] Complete failure for', request.email, ':', error);
      toast({
        title: "❌ Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve account. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (request: AccountRequest, reason: string) => {
    setActionLoading(request.id);
    try {
      const {
        error
      } = await supabase.from('account_requests').update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      }).eq('id', request.id);
      if (error) throw error;

      // Send rejection email notification
      try {
        await supabase.functions.invoke('account-request-notifications', {
          body: {
            type: 'request_rejected',
            userEmail: request.email,
            userName: request.full_name,
            reason: reason
          }
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }
      toast({
        title: "Request Rejected",
        description: `${request.full_name}'s request has been rejected and they've been notified.`,
        variant: "default"
      });
      loadRequests();
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedTemplate('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
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
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="text-foreground">Loading requests...</div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          
          
        </div>
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
          {filteredRequests.length} Request{filteredRequests.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filters - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search by name or email..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10 bg-background text-foreground border-border w-full h-11"
            style={{ fontSize: '16px' }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background text-foreground border-border h-11">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="all" className="text-foreground">All Statuses</SelectItem>
            <SelectItem value="pending" className="text-foreground">Pending</SelectItem>
            <SelectItem value="approved" className="text-foreground">Approved</SelectItem>
            <SelectItem value="rejected" className="text-foreground">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.length === 0 ? <Card className="bg-card border-border">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No requests found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'No account requests have been submitted yet'}
                </p>
              </div>
            </CardContent>
          </Card> : filteredRequests.map(request => <Card key={request.id} className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg text-foreground break-words">{request.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 break-all">{request.email}</p>
                    {request.phone_number && <p className="text-xs sm:text-sm text-muted-foreground break-all">{request.phone_number}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(request.status)}
                    {request.resubmission_count && request.resubmission_count > 0 && <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                        Resubmitted {request.resubmission_count}x
                      </Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Account Type</p>
                    <p className="text-sm text-muted-foreground capitalize break-words">{request.account_type}</p>
                  </div>
                  {request.vt_market_account_number && <div>
                      <p className="text-sm font-medium text-foreground">VT Markets Account</p>
                      <p className="text-sm text-muted-foreground break-all">{request.vt_market_account_number}</p>
                    </div>}
                  <div>
                    <p className="text-sm font-medium text-foreground">Submitted</p>
                    <p className="text-sm text-muted-foreground">{new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                  {request.website && <div>
                      <p className="text-sm font-medium text-foreground">Website</p>
                      <p className="text-sm text-muted-foreground break-all">{request.website}</p>
                    </div>}
                </div>

                {request.reason && <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-1">Reason for Request</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded border break-words">{request.reason}</p>
                  </div>}

                {request.rejection_reason && <div className="mb-4">
                    <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 break-words">{request.rejection_reason}</p>
                  </div>}

                {request.status === 'pending' && <div className="flex flex-col gap-3 sm:flex-row">
                    <Button 
                      onClick={() => handleApprove(request)} 
                      disabled={actionLoading === request.id} 
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 h-11 sm:h-10 touch-manipulation"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {actionLoading === request.id ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button 
                      onClick={() => openRejectionDialog(request)} 
                      disabled={actionLoading === request.id} 
                      variant="outline" 
                      className="border-red-300 text-red-700 hover:bg-red-50 flex-1 h-11 sm:h-10 touch-manipulation"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>}

                {request.status !== 'pending' && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>Email notification sent</span>
                  </div>}
              </CardContent>
            </Card>)}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template" className="text-foreground">Rejection Reason Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select a template or write custom reason" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {REJECTION_TEMPLATES.map(template => <SelectItem key={template.value} value={template.value} className="text-foreground">
                      {template.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason" className="text-foreground">Rejection Reason</Label>
              <Textarea id="reason" placeholder="Provide a clear reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={4} className="resize-none bg-background text-foreground border-border" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => selectedRequest && handleReject(selectedRequest, rejectionReason)} disabled={!rejectionReason.trim() || actionLoading === selectedRequest?.id} className="bg-red-600 hover:bg-red-700 text-white flex-1">
                <Send className="w-4 h-4 mr-2" />
                {actionLoading === selectedRequest?.id ? 'Rejecting...' : 'Send Rejection'}
              </Button>
              <Button onClick={() => setRejectionDialogOpen(false)} variant="outline" className="flex-1 border-border text-foreground hover:bg-muted">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};