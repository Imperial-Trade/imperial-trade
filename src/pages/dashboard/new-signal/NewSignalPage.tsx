
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedNewAlertForm from '@/components/signals/EnhancedNewAlertForm';
import { useToast } from '@/components/ui/use-toast';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { supabase } from '@/integrations/supabase/client';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

const NewSignalPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(currentUser);
      } catch (e) {
        console.log('User not logged in:', e);
        toast({
          title: "Authentication Required",
          description: "Please log in to create educational patterns.",
          variant: "destructive",
        });
        navigate('/signin');
      }
    };
    fetchUser();
  }, [toast, navigate]);

  const { createAlert } = useOptimizedTrading(user?.id || '');

  const handleCancel = () => {
    navigate('/dashboard/signal-stream');
  };

  const handleSubmit = async (data: TradeAlertSubmissionData) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create educational patterns.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Creating trade alert:', data);
      
      // Convert form data to CreateTradeAlertDto
      const createDto: CreateTradeAlertDto = {
        assetName: data.asset_name,
        tradermadeSymbol: data.tradermade_symbol,
        tradeType: data.trade_type,
        entryPrice: data.entry_price,
        stopLoss: data.stop_loss,
        tp1: data.tp1,
        tp2: data.tp2,
        tp3: data.tp3,
        tp4: data.tp4,
        tp5: data.tp5,
        notes: data.notes
      };

      const result = await createAlert(createDto);
      
      if (result) {
        toast({
          title: "🚀 Educational Pattern Created!",
          description: `${data.asset_name} ${data.trade_type.replace('_', ' ').toUpperCase()} educational analysis has been posted.`,
        });
        
        // Navigate to pattern stream page to show the new pattern
        navigate('/dashboard/signal-stream');
      } else {
        throw new Error('Failed to create educational pattern');
      }
    } catch (error) {
      console.error('Error creating trade alert:', error);
      toast({
        title: "Error Creating Educational Pattern",
        description: "Failed to create educational analysis. Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">New Educational Pattern</h1>
          <p className="text-muted-foreground mt-2">
            Create a new educational market analysis pattern with live price data and advanced features
          </p>
        </div>
        
        <EnhancedNewAlertForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default NewSignalPage;
