import React from 'react';
import { CheckCircle } from 'lucide-react';

export const SuccessMessage: React.FC = () => {
  return (
    <div 
      className="rounded-3xl p-8 text-center animate-fade-in"
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(25px) saturate(150%)',
        WebkitBackdropFilter: 'blur(25px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
      }}
    >
      <CheckCircle className="mx-auto h-16 w-16 text-gray-700" strokeWidth={2} />
      <h2 className="text-2xl font-bold mt-4 text-gray-800">Account Created!</h2>
      <p className="text-gray-600 mt-2">Welcome! Your account has been successfully created.</p>
    </div>
  );
};
