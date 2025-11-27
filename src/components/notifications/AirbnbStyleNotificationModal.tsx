import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
      const { data: existing, error: checkError } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking preferences:', checkError);
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

      // Step 3: Mark that user has seen this modal
      localStorage.setItem(`notification_permission_shown_${user.id}`, 'true');
      console.log(`✅ [Modal] Marked modal as seen for user ${user.id}`);

      const enabledCount = selectedTypes.size;
      toast({
        title: "Notifications Enabled! 🎉",
        description: `You'll receive ${enabledCount} types of notifications`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to enable notifications:', error);
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const enabledCount = selectedTypes.size;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop - Dark blur */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />

      {/* Modal - Glassmorphism Dark Theme matching filters */}
      <div 
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl 
                   pointer-events-auto
                   animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 fade-in-0 
                   duration-500 ease-out
                   max-h-[85vh] overflow-y-auto scrollbar-hide"
        style={{
          background: '#1C1C1E',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-6 pb-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-5">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #5E9FF2 0%, #7C3AED 100%)',
              }}
            >
              <span className="text-3xl">📱</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2 text-white">
            Turn on notifications
          </h2>

          {/* Description */}
          <p className="text-center text-gray-400 text-sm mb-6">
            Don't miss important trade signals, TP hits, and market updates.
          </p>

          {/* Notification Type Selection with iOS Toggles */}
          <div className="space-y-1 mb-6">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <div className="flex-1 pr-3">
                  <div className="text-sm font-medium text-white">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {type.description}
                  </div>
                </div>
                {/* iOS-style Toggle */}
                <Switch
                  checked={selectedTypes.has(type.id)}
                  onCheckedChange={() => handleToggleType(type.id)}
                  className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-600"
                />
              </div>
            ))}
          </div>

          {/* Action Button - Blue like Create Alert */}
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading || enabledCount === 0}
            className="w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all duration-200"
            style={{
              background: enabledCount === 0 
                ? 'rgba(94, 159, 242, 0.3)' 
                : 'rgba(94, 159, 242, 0.9)',
              color: '#FFFFFF',
              border: '1px solid rgba(94, 159, 242, 0.5)',
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </div>
            ) : (
              `Yes, notify me (${enabledCount} types)`
            )}
          </Button>

          {/* Skip Option */}
          <button
            onClick={onClose}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
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
