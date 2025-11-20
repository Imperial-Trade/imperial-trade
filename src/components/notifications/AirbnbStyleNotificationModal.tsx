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

      // Step 2: Save user's notification preferences to database
      const preferences: Record<string, boolean> = {};
      NOTIFICATION_TYPES.forEach(type => {
        preferences[type.id] = selectedTypes.has(type.id);
      });

      // Check if preferences already exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing preferences
        await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        // Create new preferences
        await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
          });
      }

      // Step 3: Mark that user has seen this modal
      localStorage.setItem(`notification_permission_shown_${user.id}`, 'true');

      toast({
        title: "Notifications Enabled! 🎉",
        description: `You'll receive ${selectedTypes.size} types of notifications`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to enable notifications:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Could not enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allSelected = selectedTypes.size === NOTIFICATION_TYPES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
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
            {/* Select All Option */}
            <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleToggleAll}
                className="mt-0.5"
              />
              <label
                htmlFor="select-all"
                className="flex-1 cursor-pointer"
              >
                <div className="font-semibold flex items-center gap-2">
                  Get all notifications
                  {allSelected && <Check className="h-4 w-4 text-green-600" />}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Recommended for active traders
                </div>
              </label>
            </div>

            {/* Individual Types */}
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <Checkbox
                  id={type.id}
                  checked={selectedTypes.has(type.id)}
                  onCheckedChange={() => handleToggleType(type.id)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={type.id}
                  className="flex-1 cursor-pointer"
                >
                  <div className="text-sm font-medium">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {type.description}
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading || selectedTypes.size === 0}
            className="w-full h-14 text-lg font-semibold bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </div>
            ) : (
              `Yes, notify me (${selectedTypes.size} types)`
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

