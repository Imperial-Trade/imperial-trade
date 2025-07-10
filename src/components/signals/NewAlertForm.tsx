
// Legacy form component - replaced by OptimizedNewAlertForm
// This file is kept for backward compatibility but should not be used for new implementations
// Use OptimizedNewAlertForm instead for better performance with WebSocket-based live pricing

import React from 'react';

interface NewAlertFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
}

export default function NewAlertForm({ onSubmit, onCancel }: NewAlertFormProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="text-center text-yellow-400 mb-4">
        <p>⚠️ This component has been deprecated</p>
        <p className="text-sm text-gray-400">Please use OptimizedNewAlertForm instead</p>
      </div>
      {onCancel && (
        <button 
          onClick={onCancel}
          className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-500"
        >
          Close
        </button>
      )}
    </div>
  );
}
