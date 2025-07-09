
import React from 'react';
import { OptimizedNewAlertForm } from '@/components/signals/OptimizedNewAlertForm';

const NewSignalPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">New Signal</h1>
          <p className="text-muted-foreground mt-2">
            Create a new trading signal with real-time price data
          </p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-6">
          <OptimizedNewAlertForm />
        </div>
      </div>
    </div>
  );
};

export default NewSignalPage;
