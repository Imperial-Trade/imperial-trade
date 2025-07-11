import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Phone,
  Shield,
  Calendar
} from "lucide-react";
import { AccountRequest, AuditLog } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { ProfessionalButton } from "@/components/ui/professional-button";
import { ProfessionalToast } from "@/components/ui/professional-toast";
import { useProfessionalToast } from "@/hooks/useProfessionalToast";
import { motion, AnimatePresence } from "framer-motion";

interface AccountRequestManagementProps {
  onRefresh?: () => void;
}

export const AccountRequestManagement: React.FC<AccountRequestManagementProps> = ({
  onRefresh
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const { toasts, success, error, celebrate, withProgress, updateToast, removeToast } = useProfessionalToast();

  const loadRequests = async () => {
    try {
      const data = await AccountRequest.list();
      setRequests(data);
    } catch (error) {
      console.error("Error loading requests:", error);
      error("Failed to Load", "Could not load account requests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: string, userEmail: string) => {
    setActionLoading(requestId);
    
    // Show progress toast
    const progressToastId = withProgress(
      "Approving Account",
      "Creating user account and setting up profile..."
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update progress
      updateToast(progressToastId, { progress: 25 });
      
      // Call the account-approval edge function
      const { data, error } = await supabase.functions.invoke('account-approval', {
        body: {
          requestId: requestId,
          status: 'approved'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to approve account request');
      }

      // Update progress
      updateToast(progressToastId, { 
        progress: 75,
        title: "Almost Done",
        description: "Finalizing account setup..."
      });

      // Log the admin action
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

      // Complete progress
      updateToast(progressToastId, { progress: 100 });
      
      // Remove progress toast and show success
      setTimeout(() => {
        removeToast(progressToastId);
        celebrate(
          "Account Approved! 🎉",
          `${userEmail} has been approved and can now access the platform.`
        );
      }, 500);

      // Show button success state
      setActionSuccess(requestId);
      setTimeout(() => setActionSuccess(null), 2000);

      await loadRequests();
      onRefresh?.();
    } catch (error) {
      console.error("Error approving request:", error);
      removeToast(progressToastId);
      error(
        "Approval Failed",
        error instanceof Error ? error.message : "Failed to approve account request. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, userEmail: string) => {
    if (!rejectionReason.trim()) {
      error("Rejection Reason Required", "Please provide a reason for rejection before proceeding.");
      return;
    }

    setActionLoading(requestId);
    
    const progressToastId = withProgress(
      "Rejecting Request",
      "Processing rejection and sending notification..."
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      updateToast(progressToastId, { progress: 50 });
      
      // Call the account-approval edge function for rejection
      const { data, error } = await supabase.functions.invoke('account-approval', {
        body: {
          requestId: requestId,
          status: 'rejected',
          rejectionReason: rejectionReason
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to reject account request');
      }

      updateToast(progressToastId, { progress: 100 });

      // Log the admin action
      await AuditLog.create({
        action: "reject_account_request",
        admin_email: user?.email || "admin",
        target_entity: "account_requests",
        target_id: requestId,
        details: { 
          user_email: userEmail,
          rejection_reason: rejectionReason
        }
      });

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
      await loadRequests();
      onRefresh?.();
    } catch (error) {
      console.error("Error rejecting request:", error);
      removeToast(progressToastId);
      error(
        "Rejection Failed",
        error instanceof Error ? error.message : "Failed to reject account request. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="w-4 h-4 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="w-4 h-4 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-4 h-4 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-effect border-default">
          <CardContent className="p-6 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green mx-auto mb-4"
            />
            <p className="text-secondary">Loading account requests...</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Account Request Management</h2>
          <ProfessionalButton
            onClick={loadRequests}
            variant="outline"
            className="border-default text-secondary hover:bg-surface hover:text-primary"
          >
            Refresh
          </ProfessionalButton>
        </div>

        {requests.length === 0 ? (
          <Card className="glass-effect border-default">
            <CardContent className="p-6 text-center">
              <User className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">No Account Requests</h3>
              <p className="text-secondary">There are currently no account requests to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-effect border-default hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-primary flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {request.full_name}
                        </CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-secondary" />
                            <span className="text-secondary">Email:</span>
                            <span className="text-primary">{request.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-secondary" />
                            <span className="text-secondary">Phone:</span>
                            <span className="text-primary">{request.phone_number || "Not provided"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-secondary" />
                            <span className="text-secondary">VT Account:</span>
                            <span className="text-primary">{request.vt_market_account_number}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-secondary" />
                            <span className="text-secondary">Type:</span>
                            <span className="text-primary">
                              {request.account_type === "user" ? "Standard Member" : "Educator / IB Partner"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-secondary" />
                            <span className="text-secondary">Submitted:</span>
                            <span className="text-primary">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {request.referrer && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-secondary" />
                              <span className="text-secondary">Referrer:</span>
                              <span className="text-primary">{request.referrer}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {request.reason && (
                        <div>
                          <h4 className="font-semibold text-primary mb-2">Reason for Joining:</h4>
                          <p className="text-secondary text-sm bg-surface/20 p-3 rounded">
                            {request.reason}
                          </p>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div>
                          <h4 className="font-semibold text-red-400 mb-2">Rejection Reason:</h4>
                          <p className="text-red-300 text-sm bg-red-500/10 p-3 rounded">
                            {request.rejection_reason}
                          </p>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 pt-4"
                        >
                          <ProfessionalButton
                            onClick={() => handleApprove(request.id, request.email)}
                            isLoading={actionLoading === request.id}
                            isSuccess={actionSuccess === request.id}
                            loadingText="Approving..."
                            successText="Approved!"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </ProfessionalButton>
                          
                          <ProfessionalButton
                            onClick={() => setShowRejectForm(request.id)}
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
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
                            className="border-t border-default pt-4 space-y-3"
                          >
                            <Textarea
                              placeholder="Please provide a reason for rejection..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="bg-surface border-default text-primary"
                            />
                            <div className="flex gap-2">
                              <ProfessionalButton
                                onClick={() => handleReject(request.id, request.email)}
                                isLoading={actionLoading === request.id}
                                isSuccess={actionSuccess === request.id}
                                disabled={!rejectionReason.trim()}
                                loadingText="Rejecting..."
                                successText="Rejected!"
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Confirm Rejection
                              </ProfessionalButton>
                              
                              <ProfessionalButton
                                onClick={() => {
                                  setShowRejectForm(null);
                                  setRejectionReason("");
                                }}
                                variant="outline"
                                className="border-default text-secondary hover:bg-surface"
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
      </motion.div>

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
