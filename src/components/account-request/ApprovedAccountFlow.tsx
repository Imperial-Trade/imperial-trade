
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { PasswordSetup } from './PasswordSetup';

interface ApprovedAccountFlowProps {
  accountRequest: any;
}

export const ApprovedAccountFlow: React.FC<ApprovedAccountFlowProps> = ({ 
  accountRequest 
}) => {
  const handlePasswordSetupSuccess = () => {
    // Success handling is managed within PasswordSetup component
    console.log('Password setup completed successfully');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Account Request Approved!
        </h3>
        <p className="text-gray-300 mb-6">
          Congratulations! Your account request has been approved. Please create your password to complete registration and gain exclusive access.
        </p>
      </div>

      <div className="bg-surface/20 rounded-lg p-4 space-y-2 mb-6">
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
            {accountRequest.account_type === 'educator' 
              ? 'Educator / IB Partner' 
              : 'Standard Member'}
          </span>
        </div>
        {accountRequest.approved_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Approved:</span>
            <span className="text-white">
              {new Date(accountRequest.approved_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <PasswordSetup 
        accountRequest={accountRequest} 
        onSuccess={handlePasswordSetupSuccess}
      />
    </div>
  );
};
