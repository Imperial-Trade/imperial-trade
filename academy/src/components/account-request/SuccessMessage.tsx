import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CheckAccountRequestButton } from './CheckAccountRequestButton';

interface SuccessMessageProps {
  email?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ email }) => {
  return (
    <div 
      className="rounded-2xl p-8 text-center animate-fade-in"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.08)'
      }}
    >
      <style>
        {`
          .dark .rounded-2xl {
            background: rgba(15, 15, 20, 0.3) !important;
            backdrop-filter: blur(30px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3) !important;
          }
        `}
      </style>
      <CheckCircle className="mx-auto h-16 w-16 text-gray-700 dark:text-gray-300" strokeWidth={2} />
      <h2 className="text-2xl font-bold mt-4 text-gray-800 dark:text-gray-100">Account Created!</h2>
      <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome! Your account has been successfully created.</p>
      
      <CheckAccountRequestButton email={email} />
    </div>
  );
};
