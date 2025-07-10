
import React from 'react';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { useToast } from '@/components/ui/use-toast';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';

const NewSignalPage: React.FC = () => {
  const { toast } = useToast();

  const handleSubmit = async (data: TradeAlertSubmissionData) => {
    try {
      console.log('Submitting trade alert:', data);
      // TODO: Implement actual submission logic here
      toast({
        title: "Signal Created",
        description: "Your trading signal has been created successfully.",
      });
    } catch (error) {
      console.error('Error submitting trade alert:', error);
      toast({
        title: "Error",
        description: "Failed to create trading signal. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          <OptimizedNewAlertForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
};

export default NewSignalPage;
