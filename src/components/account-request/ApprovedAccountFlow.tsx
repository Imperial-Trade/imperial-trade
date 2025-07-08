
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { PasswordSetup } from './PasswordSetup';

interface ApprovedAccountFlowProps {
  accountRequest: any;
}

export const ApprovedAccountFlow: React.FC<ApprovedAccountFlowProps> = ({ accountRequest }) => {
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);

  if (showPasswordSetup) {
    return (
      <PasswordSetup
        accountRequest={accountRequest}
        onSuccess={() => {
          // This will be handled by the redirect in PasswordSetup
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-white mb-2">
          Account Request Approved!
        </h3>
        <p className="text-gray-300 mb-4">
          Congratulations! Your account request has been approved by our administrators.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Complete your account setup by creating a secure password to access Imperial Trading.
        </p>
      </div>

      <div className="bg-surface/20 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Name:</span>
          <span className="text-white">{accountRequest.full_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Email:</span>
          <span className="text-white">{accountRequest.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Account Type:</span>
          <span className="text-white">
            {accountRequest.account_type === "user" ? "Standard Member" : "Educator / IB Partner"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Approved:</span>
          <span className="text-white">
            {new Date(accountRequest.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Button
        onClick={() => setShowPasswordSetup(true)}
        className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
      >
        <Lock className="w-5 h-5 mr-2" />
        Set Up Password & Complete Registration
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
