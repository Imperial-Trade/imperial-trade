import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignal } from '@/hooks/useOneSignal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_TYPES = [
  {
    id: 'signal_created',
    label: '🚀 New Trade Signals',
    description: 'Get notified when a new BUY/SELL signal is posted',
  },
  {
    id: 'tp_hit',
    label: '💰 Take Profit Alerts',
    description: 'Know when your TPs are hit',
  },
  {
    id: 'stop_loss_hit',
    label: '🛑 Stop Loss Alerts',
    description: 'Get notified when a stop loss is hit',
  },
  {
    id: 'limit_activated',
    label: '✅ Limit Order Activated',
    description: 'Know when your pending orders activate',
  },
  {
    id: 'notes_updated',
    label: '📝 Notes Updates',
    description: 'Get updates when signal notes change',
  },
];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AirbnbStyleNotificationModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { subscribeToPush } = useOneSignal();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(NOTIFICATION_TYPES.map(t => t.id)) // All selected by default
  );

  const handleToggleAll = () => {
    if (selectedTypes.size === NOTIFICATION_TYPES.length) {
      // Deselect all
      setSelectedTypes(new Set());
    } else {
      // Select all
      setSelectedTypes(new Set(NOTIFICATION_TYPES.map(t => t.id)));
    }
  };

  const handleToggleType = (typeId: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(typeId)) {
      newSelected.delete(typeId);
    } else {
      newSelected.add(typeId);
    }
    setSelectedTypes(newSelected);
  };

  const handleEnableNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Step 1: Subscribe to OneSignal push notifications
      const subscribed = await subscribeToPush();
      
      if (!subscribed) {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your device settings.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Step 2: Save user's notification preferences to database (All enabled by default)
      const preferences: Record<string, boolean> = {};
      NOTIFICATION_TYPES.forEach(type => {
        preferences[type.id] = true;
      });

      // Check if preferences already exist
      const { data: existing, error: checkError } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking preferences:', checkError);
        // Continue anyway, not critical blocking
      }

      if (existing) {
        // Update existing preferences
        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating preferences:', updateError);
        }
      } else {
        // Create new preferences
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error inserting preferences:', insertError);
        }
      }

      // Step 3: Mark that user has seen this modal (CRITICAL - prevents modal from showing again)
      localStorage.setItem(`notification_permission_shown_${user.id}`, 'true');
      console.log(`✅ [Modal] Marked modal as seen for user ${user.id}`);

      toast({
        title: "Notifications Enabled! 🎉",
        description: `You'll receive all types of notifications`,
      });

      // Close modal and call success callback
      onSuccess();
    } catch (error: any) {
      console.error('Failed to enable notifications:', error);
      // Even if preferences fail to save, if push succeeded, we should consider it a success
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const allSelected = selectedTypes.size === NOTIFICATION_TYPES.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />

      {/* Modal - Bottom Sheet on Mobile, Center Modal on Desktop */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl 
                      pointer-events-auto
                      animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 fade-in-0 
                      duration-500 ease-out
                      max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-8 pb-6">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">📱</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-3">
            Turn on notifications
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Don't miss important trade signals, TP hits, and market updates.
          </p>

          {/* Notification Type Selection */}
          <div className="space-y-3 mb-6">
            {/* Individual Types */}
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="mt-0.5 text-green-500">
                  <Check className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {type.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full h-14 text-lg font-semibold bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </div>
            ) : (
              `Yes, notify me (${NOTIFICATION_TYPES.length} types)`
            )}
          </Button>

          {/* Skip Option */}
          <button
            onClick={onClose}
            className="w-full mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* iPhone-style bottom bar (mobile only) */}
        <div className="h-6 sm:hidden" />
      </div>
    </div>
  );
}

