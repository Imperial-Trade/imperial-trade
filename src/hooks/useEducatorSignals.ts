
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EducatorAnalytics {
  total_signals: number;
  active_signals: number;
  closed_signals: number;
  total_followers: number;
  total_views: number;
  total_copies: number;
  avg_success_rate: number;
  avg_performance_score: number;
}

interface SignalFollower {
  id: string;
  follower_id: string;
  signal_id: string;
  followed_at: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    discord: boolean;
    telegram: boolean;
  };
}

export function useEducatorSignals() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<EducatorAnalytics | null>(null);
  const [followers, setFollowers] = useState<SignalFollower[]>([]);
  const [loading, setLoading] = useState(true);

  // Load educator analytics - simplified approach using trade_alerts table
  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      // Get basic signal counts from trade_alerts
      const { data: signals, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', user.id);

      if (signalsError) {
        console.error('Error loading signals:', signalsError);
        return;
      }

      // Calculate analytics from signals data
      const mockAnalytics: EducatorAnalytics = {
        total_signals: signals?.length || 0,
        active_signals: signals?.filter(s => s.status === 'active').length || 0,
        closed_signals: signals?.filter(s => s.status === 'closed').length || 0,
        total_followers: 0, // Will be updated when we have followers data
        total_views: 0,
        total_copies: 0,
        avg_success_rate: 0.75, // Mock data for now
        avg_performance_score: 85 // Mock data for now
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Load signal followers - simplified approach
  const loadFollowers = async () => {
    if (!user?.id) return;

    try {
      // For now, return empty array as we'll implement followers later
      setFollowers([]);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  // Send signal notification using edge function
  const notifyFollowers = async (signalId: string, message: string) => {
    try {
      console.log('📤 Sending notification to followers for signal:', signalId);
      
      // Get signal details to create proper notification payload
      const { data: signal, error: signalError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('id', signalId)
        .single();

      if (signalError) {
        console.error('Error fetching signal for notification:', signalError);
        return;
      }

      // Get author profile
      const { data: author } = await (supabase as any)
        .from('public_profiles')
        .select('display_name, avatar_url')
        .eq('id', signal.user_id)
        .single();

      const notificationPayload = {
        signal_id: signalId,
        user_id: signal.user_id,
        alert_type: 'signal_updated',
        notification_type: 'signal_updated',
        delivery_channels: ['push', 'in_app'],
        asset_name: signal.asset_name,
        symbol: signal.tradermade_symbol,
        tradermade_symbol: signal.tradermade_symbol,
        trade_type: signal.trade_type,
        entry_price: Number(signal.entry_price),
        stop_loss: Number(signal.stop_loss),
        tp1: signal.tp1 ? Number(signal.tp1) : undefined,
        tp2: signal.tp2 ? Number(signal.tp2) : undefined,
        tp3: signal.tp3 ? Number(signal.tp3) : undefined,
        tp4: signal.tp4 ? Number(signal.tp4) : undefined,
        tp5: signal.tp5 ? Number(signal.tp5) : undefined,
        status: signal.status,
        author_name: author?.display_name || 'Anonymous Trader',
        author_avatar_url: author?.avatar_url,
        notes: message,
        include_creator: false
      };

      const result = await supabase.functions.invoke('signal-notification-dispatcher', {
        body: { notifications: [notificationPayload] }
      });

      if (result.error) {
        console.error('❌ Failed to send notification:', result.error);
      } else {
        console.log('✅ Notification sent successfully:', result.data);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  // Update signal analytics - simplified version
  const updateSignalAnalytics = async (signalId: string, updates: Partial<{
    followers_count: number;
    engagement_score: number;
    performance_score: number;
    total_views: number;
    total_copies: number;
    success_rate: number;
    avg_profit_loss: number;
  }>) => {
    try {
      // For now, just log the update - can be enhanced later with proper RPC
      console.log('Updating signal analytics:', signalId, updates);
    } catch (error) {
      console.error('Error updating signal analytics:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([loadAnalytics(), loadFollowers()]).finally(() => {
        setLoading(false);
      });

      // Set up real-time subscriptions for trade_alerts table
      const analyticsChannel = supabase
        .channel('educator-analytics')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trade_alerts',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(analyticsChannel);
      };
    }
  }, [user?.id]);

  return {
    analytics,
    followers,
    loading,
    notifyFollowers,
    updateSignalAnalytics,
    refreshAnalytics: loadAnalytics,
    refreshFollowers: loadFollowers
  };
}
