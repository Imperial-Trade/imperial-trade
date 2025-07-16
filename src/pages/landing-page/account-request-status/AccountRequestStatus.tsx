import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { PageStyles } from "@/components/account-request/PageStyles";
import { ApprovedAccountFlow } from "@/components/account-request/ApprovedAccountFlow";
import { NoRequestFound } from "@/components/account-request/NoRequestFound";
import { ErrorDisplay } from "@/components/account-request/ErrorDisplay";
import { ExistingRequestNotice } from "@/components/account-request/ExistingRequestNotice";
import { UpdateAccountRequestForm } from "@/components/account-request/UpdateAccountRequestForm";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { useAccountRequestCheck } from "@/hooks/useAccountRequestCheck";
import { AccountRequestData } from "@/api/entities/AccountRequest";
import { ResubmissionConfirmation } from "@/components/account-request/ResubmissionConfirmation";
import { RequestHistoryTimeline } from "@/components/account-request/RequestHistoryTimeline";

type ViewMode = 'check' | 'status' | 'update' | 'success';

export default function AccountRequestStatusPage() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('check');
  const [currentRequest, setCurrentRequest] = useState<AccountRequestData | null>(null);

  const {
    status,
    error,
    isLoading,
    checkStatus,
    retryCheck,
    resetState,
  } = useAccountStatus();

  const {
    existingRequest,
    isChecking,
    error: checkError,
    checkForExistingRequest,
    clearCheck,
  } = useAccountRequestCheck();

  const handleCheckStatus = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;
    
    const emailToCheck = email.toLowerCase().trim();
    setSearchEmail(emailToCheck);
    
    // First check for existing request in our new system
    const existingReq = await checkForExistingRequest(emailToCheck);
    if (existingReq) {
      setCurrentRequest(existingReq);
      setViewMode('status');
    } else {
      // Fall back to original status check for legacy requests
      checkStatus(emailToCheck);
    }
  }, [email, isLoading, checkStatus, checkForExistingRequest]);

  const handleShowUpdate = useCallback(() => {
    setViewMode('update');
  }, []);

  const handleUpdateSuccess = useCallback((updatedRequest: AccountRequestData) => {
    setCurrentRequest(updatedRequest);
    setViewMode('success');
  }, []);

  const handleBackToCheck = useCallback(() => {
    setViewMode('check');
    setCurrentRequest(null);
    setEmail("");
    setSearchEmail("");
    resetState();
    clearCheck();
  }, [resetState, clearCheck]);

  const handleCheckAnother = useCallback(() => {
    console.log('Checking another email - resetting state');
    handleBackToCheck();
  }, [handleBackToCheck]);

  const handleRefreshStatus = useCallback(() => {
    if (searchEmail) {
      console.log('Refreshing status for:', searchEmail);
      retryCheck();
    }
  }, [searchEmail, retryCheck]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-8 h-8 text-yellow-400" />;
      case "rejected":
        return <XCircle className="w-8 h-8 text-red-400" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return {
          title: "Request Pending",
          message: "Your account request is currently being reviewed by our administrators.",
          instructions: "Please wait 12-48 hours for approval. You will receive an email notification once your request has been processed."
        };
      case "rejected":
        return {
          title: "Request Denied",
          message: "We're sorry, but your account request has been denied.",
          instructions: "We cannot validate your VT Market credentials. Please contact support if you believe this is an error."
        };
      default:
        return {
          title: "Unknown Status",
          message: "Unable to determine request status.",
          instructions: "Please contact support for assistance."
        };
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <VideoBackground />

      <div className="relative z-20 max-w-2xl w-full">
        <BrandHeader />

        {viewMode === 'check' && (
          <Card className="glass-effect border-default">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white text-center">
                Account Request Status
              </CardTitle>
              <p className="text-gray-300 text-center">
                Check the status of your account request
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCheckStatus} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10 bg-white border-gray-300 text-gray-900"
                      required
                      disabled={isLoading || isChecking}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isChecking || !email.trim()}
                  className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
                >
                  {isLoading || isChecking ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    "Check Status"
                  )}
                </Button>
              </form>

              <div className="pt-4">
                <Link to={createPageUrl("account-request")}>
                  <Button
                    variant="outline"
                    className="w-full border-white/20 hover:bg-white/10 text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Request Form
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'status' && currentRequest && (
          <div className="space-y-6">
            <ExistingRequestNotice
              request={currentRequest}
              onUpdate={currentRequest.status === 'rejected' ? handleShowUpdate : undefined}
              onStartNew={handleBackToCheck}
            />

            <RequestHistoryTimeline request={currentRequest} />

            <div className="flex gap-3">
              <Button
                onClick={handleBackToCheck}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Check Another Email
              </Button>
            </div>
          </div>
        )}

        {viewMode === 'update' && currentRequest && (
          <UpdateAccountRequestForm
            existingRequest={currentRequest}
            onSuccess={handleUpdateSuccess}
            onCancel={() => setViewMode('status')}
          />
        )}

        {viewMode === 'success' && currentRequest && (
          <ResubmissionConfirmation
            updatedRequest={currentRequest}
            onBackToCheck={handleBackToCheck}
          />
        )}

        {!currentRequest && error && error.type === 'not_found' && (
          <NoRequestFound email={searchEmail} onCheckAnother={handleCheckAnother} />
        )}

        {!currentRequest && error && error.type !== 'not_found' && (
          <ErrorDisplay 
            error={error} 
            onRetry={retryCheck}
            onCheckAnother={handleCheckAnother}
            isRetrying={isLoading}
          />
        )}

        {!currentRequest && status?.status === "approved" && (
          <ApprovedAccountFlow accountRequest={status} />
        )}

        {!currentRequest && status && status.status !== "approved" && (
          <div className="space-y-6">
            <div className="text-center">
              {getStatusIcon(status.status)}
              <h3 className="text-xl font-semibold text-white mt-4">
                {getStatusMessage(status.status).title}
              </h3>
              <p className="text-gray-300 mt-2">
                {getStatusMessage(status.status).message}
              </p>
              <p className="text-sm text-gray-400 mt-4">
                {getStatusMessage(status.status).instructions}
              </p>
            </div>

            <div className="bg-surface/20 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Name:</span>
                <span className="text-white">{status.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{status.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Account Type:</span>
                <span className="text-white">
                  {status.account_type === "user" ? "Standard Member" : "Educator / IB Partner"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Submitted:</span>
                <span className="text-white">
                  {new Date(status.created_at).toLocaleDateString()}
                </span>
              </div>
              {status.rejection_reason && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reason:</span>
                  <span className="text-red-300">
                    {status.rejection_reason}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRefreshStatus}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 h-12"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  "Refresh Status"
                )}
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={handleCheckAnother}
                disabled={isLoading}
              >
                Check Another Email
              </Button>
            </div>
          </div>
        )}
      </div>

      <PageStyles />
    </div>
  );
}
