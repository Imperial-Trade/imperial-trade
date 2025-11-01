import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle, Edit3, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { AccountRequestData } from '@/api/entities/AccountRequest';
import { createPageUrl } from "@/utils";

interface ExistingRequestNoticeProps {
  request: AccountRequestData;
  onUpdate?: () => void;
  onCheckStatus?: () => void;
  onStartNew?: () => void;
}

export const ExistingRequestNotice: React.FC<ExistingRequestNoticeProps> = ({
  request,
  onUpdate,
  onCheckStatus,
  onStartNew
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  const getActionMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your request is currently being reviewed. You can check the status or wait for an email notification.";
      case "approved":
        return "Your request has been approved! You can now sign in to access your account.";
      case "rejected":
        return "Your request was rejected. You can update and resubmit your request with corrected information.";
      default:
        return "There's an existing request for this email address.";
    }
  };

  const isRejected = request.status === 'rejected';
  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          {getStatusIcon(request.status!)}
          Existing Account Request Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Status:</span>
          {getStatusBadge(request.status!)}
        </div>

        <div className="bg-surface/20 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Name:</span>
            <span className="text-white">{request.full_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Email:</span>
            <span className="text-white">{request.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Account Type:</span>
            <span className="text-white">
              {request.account_type === 'educator' ? 'Educator / IB Partner' : 'Standard Member'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Submitted:</span>
            <span className="text-white">
              {new Date(request.created_at!).toLocaleDateString()}
            </span>
          </div>
          {request.resubmission_count && request.resubmission_count > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Resubmissions:</span>
              <span className="text-white">{request.resubmission_count}</span>
            </div>
          )}
        </div>

        {isRejected && request.rejection_reason && (
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h4 className="font-semibold text-red-400 mb-2">Rejection Reason:</h4>
            <p className="text-red-300 text-sm">{request.rejection_reason}</p>
          </div>
        )}

        <div className="pt-2">
          <p className="text-gray-300 text-sm mb-4">
            {getActionMessage(request.status!)}
          </p>

          <div className="flex flex-col gap-3">
            {isApproved && (
              <Link to={createPageUrl("signin")}>
                <Button className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Your Account
                </Button>
              </Link>
            )}

            {isRejected && onUpdate && (
              <Button
                onClick={onUpdate}
                className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Update & Resubmit Request
              </Button>
            )}

            {(isPending || isApproved) && onCheckStatus && (
              <Button
                onClick={onCheckStatus}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 h-12"
              >
                View Full Status
              </Button>
            )}

            {onStartNew && (
              <Button
                variant="outline"
                onClick={onStartNew}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Use Different Email
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
