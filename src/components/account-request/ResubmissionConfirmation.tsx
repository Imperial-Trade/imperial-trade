
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { AccountRequestData } from '@/api/entities/AccountRequest';

interface ResubmissionConfirmationProps {
  updatedRequest: AccountRequestData;
  onBackToCheck: () => void;
}

export const ResubmissionConfirmation: React.FC<ResubmissionConfirmationProps> = ({
  updatedRequest,
  onBackToCheck
}) => {
  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white text-center">
          Request Updated Successfully!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="text-green-400">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Resubmitted for Review
          </h3>
          <p className="text-gray-300">
            Your updated request has been resubmitted and is now pending review. 
            You will receive an email notification once it's processed.
          </p>
        </div>

        <div className="bg-surface/20 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status:</span>
            <span className="text-yellow-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Pending Review
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Resubmission Count:</span>
            <span className="text-white">{updatedRequest.resubmission_count || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Last Updated:</span>
            <span className="text-white">
              {updatedRequest.updated_at ? new Date(updatedRequest.updated_at).toLocaleDateString() : 'Just now'}
            </span>
          </div>
          {updatedRequest.original_rejection_reason && (
            <div className="pt-2 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Previous Issue:</div>
              <div className="text-xs text-gray-300">{updatedRequest.original_rejection_reason}</div>
            </div>
          )}
        </div>

        <Button
          onClick={onBackToCheck}
          className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Done
        </Button>
      </CardContent>
    </Card>
  );
};
