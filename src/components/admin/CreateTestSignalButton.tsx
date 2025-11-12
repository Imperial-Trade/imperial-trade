import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FlaskConical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const CreateTestSignalButton = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const createTestSignal = async () => {
    if (!user) {
      toast.error('You must be logged in to create test signals');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-signal', {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Test Signal Created!', {
          description: (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{data.signal.asset_name}</p>
              <p>{data.signal.trade_type.toUpperCase()} @ {data.signal.entry_price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Watch for notifications!</p>
            </div>
          ),
          duration: 8000,
        });
      } else {
        throw new Error(data?.error || 'Failed to create test signal');
      }
    } catch (error: any) {
      console.error('Error creating test signal:', error);
      toast.error('Failed to create test signal', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={createTestSignal}
      disabled={isCreating}
      variant="outline"
      size="sm"
      className="gap-2 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30"
    >
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <FlaskConical className="h-4 w-4" />
          Create Test Signal
        </>
      )}
    </Button>
  );
};