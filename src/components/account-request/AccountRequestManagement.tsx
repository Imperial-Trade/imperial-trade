
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AccountRequestManagementProps {
  onRefresh?: () => void;
}

export const AccountRequestManagement: React.FC<AccountRequestManagementProps> = ({
  onRefresh
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRequests = async () => {
    try {
      const data = await AccountRequest.list();
      setRequests(data);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load account requests.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: string, userEmail: string) => {
    setActionLoading(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update request status
      await AccountRequest.update(requestId, {
        status: "approved",
        approved_by: user?.email || "admin"
      });

      // Log the action
      await AuditLog.create({
        action: "approve_account_request",
        admin_email: user?.email || "admin",
        target_entity: "account_requests",
        target_id: requestId,
        details: { user_email: userEmail }
      });

      toast({
        title: "Success",
        description: "Account request approved successfully.",
      });

      await loadRequests();
      onRefresh?.();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve account request.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, userEmail: string) => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for rejection.",
      });
      return;
    }

    setActionLoading(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update request status
      await AccountRequest.update(requestId, {
        status: "rejected",
        approved_by: user?.email || "admin",
        rejection_reason: rejectionReason
      });

      // Log the action
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

      toast({
        title: "Success",
        description: "Account request rejected.",
      });

      setRejectionReason("");
      setShowRejectForm(null);
      await loadRequests();
      onRefresh?.();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject account request.",
      });
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
      <Card className="glass-effect border-default">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green mx-auto mb-4"></div>
          <p className="text-secondary">Loading account requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Account Request Management</h2>
        <Button
          onClick={loadRequests}
          variant="outline"
          className="border-default text-secondary hover:bg-surface hover:text-primary"
        >
          Refresh
        </Button>
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
          {requests.map((request) => (
            <Card key={request.id} className="glass-effect border-default">
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
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleApprove(request.id, request.email)}
                      disabled={actionLoading === request.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === request.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowRejectForm(request.id)}
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {showRejectForm === request.id && (
                  <div className="border-t border-default pt-4 space-y-3">
                    <Textarea
                      placeholder="Please provide a reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="bg-surface border-default text-primary"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReject(request.id, request.email)}
                        disabled={actionLoading === request.id || !rejectionReason.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {actionLoading === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          "Confirm Rejection"
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowRejectForm(null);
                          setRejectionReason("");
                        }}
                        variant="outline"
                        className="border-default text-secondary hover:bg-surface"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
