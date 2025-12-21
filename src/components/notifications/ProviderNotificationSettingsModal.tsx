import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignal } from '@/hooks/useOneSignal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const { colors, isDark } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleToggleType = (typeId: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(typeId)) {
      newSelected.delete(typeId);
    } else {
      newSelected.add(typeId);
    }
    setSelectedTypes(newSelected);
  };

  const handleToggleProvider = (providerId: string) => {
    const newSelected = new Set(selectedProviders);
    if (newSelected.has(providerId)) {
      newSelected.delete(providerId);
    } else {
      newSelected.add(providerId);
    }
    setSelectedProviders(newSelected);
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Step 1: Ensure user is subscribed to push notifications
      if (!isPushEnabled) {
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
      }

      // Step 2: Save notification type preferences
      const preferences: Record<string, boolean> = {};
      NOTIFICATION_TYPES.forEach(type => {
        preferences[type.id] = selectedTypes.has(type.id);
      });

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      // Step 3: Save provider subscriptions
      const providerIds = educatorOptions.map(p => p.id);
      
      // Process all providers: upsert selected, deactivate unselected
      for (const providerId of providerIds) {
        const isSelected = selectedProviders.has(providerId);
        
        if (isSelected) {
          // Upsert selected providers (is_active = true)
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
          // Deactivate unselected providers
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
      }

      const enabledCount = selectedTypes.size;
      const providerCount = selectedProviders.size;
      toast({
        title: "Settings Saved! 🎉",
        description: `You'll receive ${enabledCount} types of notifications from ${providerCount} provider${providerCount !== 1 ? 's' : ''}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('❌ [Modal] Failed to save preferences:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const enabledCount = selectedTypes.size;
  const providerCount = selectedProviders.size;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom-mobile" : "right"}
        className={cn(
          "w-full border-border/50 [&>button]:hidden flex flex-col",
          isMobile ? "p-0 rounded-none border-0 !z-[9998]" : "sm:max-w-md inset-y-0"
        )}
        style={{
          background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
          backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 'max(env(safe-area-inset-bottom, 0px), 12px)',
          ...(isMobile && {
            zIndex: 9998, // Behind bottom nav bar (9999) on mobile
            maxHeight: 'calc(100vh - 72px)',
            height: 'calc(100vh - 72px)',
            bottom: '72px', // Position just above bottom nav bar - no gap
            marginBottom: 0,
            paddingBottom: 0,
          }),
        }}
      >
        <div className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-4" : "")}>
        {/* Title Header - Desktop/Tablet only */}
        {!isMobile && (
          <div 
            className="px-6 pt-4 pb-4 border-b border-border/50 sticky top-0 z-10"
            style={{
              background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
              backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
              WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" style={{ color: '#D4AF37' }} />
              <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                Notification
              </span>
            </div>
          </div>
        )}

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
          <div className={cn("flex-1 overflow-y-auto", isMobile ? "mt-4 pb-4 min-h-0" : "mt-4")}>
            <div className="pr-4 space-y-6">
              {/* Description */}
              <p className="text-center text-sm" style={{ color: colors.text.secondary }}>
                Choose notification types and select which providers you want to follow.
              </p>

              {/* Notification Type Selection with iOS Toggles */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text.primary }}>Notification Types</h3>
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
                    {/* iOS-style Toggle */}
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
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text.primary }}>Provider Subscriptions</h3>
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
                      {/* iOS-style Toggle */}
                      <Switch
                        checked={selectedProviders.has(provider.id)}
                        onCheckedChange={() => handleToggleProvider(provider.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-600"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button - Blue like Create Alert */}
              <div className="pt-4 pb-8">
                <Button
                  onClick={handleSavePreferences}
                  disabled={isLoading || enabledCount === 0 || providerCount === 0}
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all duration-200"
                  style={{
                    background: (enabledCount === 0 || providerCount === 0)
                      ? 'rgba(94, 159, 242, 0.3)' 
                      : 'rgba(94, 159, 242, 0.9)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(94, 159, 242, 0.5)',
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-5 w-5 border-2 rounded-full animate-spin" 
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          borderTopColor: 'rgba(255, 255, 255, 1)',
                        }}
                      />
                      Saving...
                    </div>
                  ) : (
                    `Save Settings (${enabledCount} types, ${providerCount} provider${providerCount !== 1 ? 's' : ''})`
                  )}
                </Button>

                {/* Cancel Option */}
                <button
                  onClick={onClose}
                  className="w-full mt-4 text-sm transition-colors"
                  style={{ 
                    color: colors.text.secondary 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.text.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = colors.text.secondary}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

