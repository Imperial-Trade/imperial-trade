
import React from 'react';
import PendingOrderSystemDebug from '@/components/debug/PendingOrderSystemDebug';

const PendingOrderSystemPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pending Order System</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and debug the limit order pending system for Xeon Stream
        </p>
      </div>
      
      <PendingOrderSystemDebug />
    </div>
  );
};

export default PendingOrderSystemPage;
