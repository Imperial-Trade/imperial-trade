import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  signal_created: z.boolean(),
  signal_updated: z.boolean(),
  signal_closed: z.boolean(),
  tp_hits: z.boolean(),
  stop_loss_hits: z.boolean(),
  price_alerts: z.boolean(),
  push_notifications: z.boolean(),
  in_app_notifications: z.boolean(),
  discord_notifications: z.boolean(),
  telegram_notifications: z.boolean(),
  include_own_signals: z.boolean(),
  minimum_priority_level: z.number().int().min(1).max(3),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export type NotificationPreferencesUpdate = Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification_preferences', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      console.log('🔔 Fetching notification preferences for user:', user?.id);
      
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching notification preferences:', error);
        throw new Error(error.message);
      }

      // If no preferences found, return defaults
      if (!data) {
        console.log('📋 No preferences found, using defaults');
        return {
          signal_created: true,
          signal_updated: true,
          signal_closed: true,
          tp_hits: true,
          stop_loss_hits: true,
          price_alerts: true,
          push_notifications: true,
          in_app_notifications: true,
          discord_notifications: false,
          telegram_notifications: false,
          include_own_signals: false,
          minimum_priority_level: 1,
          quiet_hours_start: null,
          quiet_hours_end: null,
        } as NotificationPreferencesUpdate;
      }

      console.log('✅ Notification preferences loaded:', data);
      return NotificationPreferencesSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: NotificationPreferencesUpdate) => {
      if (!user?.id) throw new Error('No user ID available');

      console.log('🔄 Updating notification preferences:', updates);

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating notification preferences:', error);
        throw new Error(error.message);
      }

      console.log('✅ Notification preferences updated:', data);
      return NotificationPreferencesSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification_preferences', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] });
    },
    onError: (error) => {
      console.error('❌ Failed to update notification preferences:', error);
    },
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID available');

      console.log('🔄 Resetting notification preferences to defaults');

      const defaults: NotificationPreferencesUpdate = {
        signal_created: true,
        signal_updated: true,
        signal_closed: true,
        tp_hits: true,
        stop_loss_hits: true,
        price_alerts: true,
        push_notifications: true,
        in_app_notifications: true,
        discord_notifications: false,
        telegram_notifications: false,
        include_own_signals: false,
        minimum_priority_level: 1,
        quiet_hours_start: null,
        quiet_hours_end: null,
      };

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...defaults,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error resetting notification preferences:', error);
        throw new Error(error.message);
      }

      console.log('✅ Notification preferences reset to defaults:', data);
      return NotificationPreferencesSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification_preferences', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
    resetToDefaults: resetToDefaultsMutation.mutate,
    isResetting: resetToDefaultsMutation.isPending,
  };
};