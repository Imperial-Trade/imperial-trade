import { useState, useEffect, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignal } from '@/hooks/useOneSignal';
import { supabase } from '@/integrations/supabase/client';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface Provider {
  id: string;
  name: string;
}

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  educatorOptions: Provider[];
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  statusOptions?: Array<{ value: string; label: string; icon?: any }>;
  tradeTypeOptions?: Array<{ value: string; label: string; icon?: any }>;
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
  onOpenFilterSheet?: (type: 'status' | 'tradeType' | 'educator') => void;
}

export function ProviderNotificationSettingsModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  educatorOptions,
  filters,
  onFiltersChange,
  statusOptions = [],
  tradeTypeOptions = [],
  canCreateSignals = false,
  onCreateSignal,
  onOpenFilterSheet
}: Props) {
  const { user } = useAuth();
  const { subscribeToPush, isPushEnabled } = useOneSignal();
  const { colors, isDark } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(NOTIFICATION_TYPES.map(t => t.id)) // All selected by default
  );
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(
    new Set(educatorOptions.map(p => p.id)) // All providers ON by default
  );

  // Load existing preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setIsLoadingPreferences(false);
        return;
      }

      try {
        // Load notification type preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefs) {
          const types = new Set<string>();
          NOTIFICATION_TYPES.forEach(type => {
            if (prefs[type.id] !== false) {
              types.add(type.id);
            }
          });
          setSelectedTypes(types);
        }

        // Load provider subscriptions
        const { data: subscriptions } = await supabase
          .from('signal_subscriptions')
          .select('provider_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (subscriptions && subscriptions.length > 0) {
          setSelectedProviders(new Set(subscriptions.map(s => s.provider_id)));
        } else {
          // If no subscriptions exist, default to all providers ON
          setSelectedProviders(new Set(educatorOptions.map(p => p.id)));
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [user, educatorOptions]);

  // Show success toast with custom checkmark icon
  const showSuccessToast = useCallback(() => {
    toast('Notification settings saved', {
      icon: (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white">
          <Check className="w-3 h-3 text-black" strokeWidth={3} />
        </div>
      ),
      position: isMobile ? 'bottom-center' : 'bottom-right',
      duration: 2000,
    });
  }, [isMobile]);

  // Save notification type preference to database
  const saveNotificationType = useCallback(async (typeId: string, isEnabled: boolean) => {
    if (!user) return;
    
    try {
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('notification_preferences')
          .update({
            [typeId]: isEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            [typeId]: isEnabled,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
      
      showSuccessToast();
    } catch (error) {
      console.error('Failed to save notification type:', error);
    }
  }, [user, showSuccessToast]);

  // Save provider subscription to database
  const saveProviderSubscription = useCallback(async (providerId: string, isActive: boolean) => {
    if (!user) return;
    
    try {
      if (isActive) {
        await supabase
          .from('signal_subscriptions')
          .upsert({
            user_id: user.id,
            provider_id: providerId,
            is_active: true,
            subscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,provider_id',
          });
      } else {
        await supabase
          .from('signal_subscriptions')
          .update({
            is_active: false,
            unsubscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('provider_id', providerId);
      }
      
      showSuccessToast();
    } catch (error) {
      console.error('Failed to save provider subscription:', error);
    }
  }, [user, showSuccessToast]);

  const handleToggleType = (typeId: string) => {
    const newSelected = new Set(selectedTypes);
    const isNowEnabled = !newSelected.has(typeId);
    
    if (isNowEnabled) {
      newSelected.add(typeId);
    } else {
      newSelected.delete(typeId);
    }
    setSelectedTypes(newSelected);
    
    // Auto-save to database
    saveNotificationType(typeId, isNowEnabled);
  };

  const handleToggleProvider = (providerId: string) => {
    const newSelected = new Set(selectedProviders);
    const isNowActive = !newSelected.has(providerId);
    
    if (isNowActive) {
      newSelected.add(providerId);
    } else {
      newSelected.delete(providerId);
    }
    setSelectedProviders(newSelected);
    
    // Auto-save to database
    saveProviderSubscription(providerId, isNowActive);
  };


  // Shared content for both mobile bottom sheet and desktop side panel
  const modalContent = (
    <>
      {/* Drag Handle Indicator - Instagram style (mobile only) */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
        </div>
      )}
      
      {/* Header */}
      <div 
        className={cn(
          "flex flex-col",
          isMobile ? "px-4" : ""
        )}
        style={{
          background: isDark ? 'rgba(15, 15, 20, 0.98)' : '#FFFFFF',
        }}
      >
        <div className={cn(
          "px-2 pb-3",
          isMobile ? "pt-2" : "pt-4 px-6"
        )}>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: '#D4AF37' }} />
            <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
              Notifications
            </span>
          </div>
        </div>
      </div>

      {isLoadingPreferences ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div 
            className="h-8 w-8 border-2 rounded-full animate-spin" 
            style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {/* Description */}
            <p className="text-center text-sm" style={{ color: colors.text.secondary }}>
              Choose notification types and select which providers you want to follow.
            </p>

            {/* Notification Type Selection with iOS Toggles */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>Notification Types</h3>
              {NOTIFICATION_TYPES.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                  }}
                >
                  <div className="flex-1 pr-3">
                    <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                      {type.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                      {type.description}
                    </div>
                  </div>
                  <Switch
                    checked={selectedTypes.has(type.id)}
                    onCheckedChange={() => handleToggleType(type.id)}
                    className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-600"
                  />
                </div>
              ))}
            </div>

            {/* Provider Subscriptions Section */}
            {educatorOptions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>Provider Subscriptions</h3>
                {educatorOptions.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    }}
                  >
                    <div className="flex-1 pr-3">
                      <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                        {provider.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                        Receive notifications from this provider
                      </div>
                    </div>
                    <Switch
                      checked={selectedProviders.has(provider.id)}
                      onCheckedChange={() => handleToggleProvider(provider.id)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Auto-saves on toggle - no button needed */}
            <div className="pt-2 pb-4" />
          </div>
        </div>
      )}
    </>
  );

  // Both mobile and desktop use Sheet - mobile as bottom sheet, desktop as right panel
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom-mobile" : "right"}
        className={cn(
          "w-full border-border/50 [&>button]:hidden flex flex-col p-0",
          isMobile ? "" : "sm:max-w-md inset-y-0"
        )}
        style={{
          background: isDark ? 'rgba(15, 15, 20, 0.98)' : '#FFFFFF',
          backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          paddingTop: isMobile ? 0 : 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {modalContent}
      </SheetContent>
    </Sheet>
  );
}

