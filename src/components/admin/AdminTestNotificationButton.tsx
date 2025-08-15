import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminTestNotificationButtonProps {
  className?: string;
}

export const AdminTestNotificationButton: React.FC<AdminTestNotificationButtonProps> = ({ className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Only show for admins
  if (user?.user_metadata?.access_level !== 'admin') {
    return null;
  }

  const handleSendTestNotification = async () => {
    if (!user?.id) {
      toast.error('Not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🧪 [Admin] Sending test notification to current user');
      
      const { data, error } = await supabase.functions.invoke('onesignal-test-notification', {
        body: {
          target_user_id: user.id,
          test_message: 'Test notification from Imperial Trade admin panel',
          test_type: 'admin_test'
        }
      });

      if (error) {
        console.error('❌ [Admin] Test notification failed:', error);
        toast.error('Failed to send test notification');
      } else {
        console.log('✅ [Admin] Test notification sent successfully:', data);
        toast.success('Test notification sent! Check your device.');
      }
    } catch (error) {
      console.error('❌ [Admin] Test notification error:', error);
      toast.error('Error sending test notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSendTestNotification}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className={`border-primary/20 text-primary hover:bg-primary/10 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Send Test Push
        </>
      )}
    </Button>
  );
};