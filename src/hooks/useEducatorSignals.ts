
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

  // Load educator analytics
  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('educator_performance_summary')
        .select('*')
        .eq('educator_id', user.id)
        .single();

      if (data) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Load signal followers
  const loadFollowers = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('signal_followers')
        .select(`
          *,
          trade_alerts!inner(user_id)
        `)
        .eq('trade_alerts.user_id', user.id);

      if (data) {
        setFollowers(data);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  // Send signal notification
  const notifyFollowers = async (signalId: string, message: string) => {
    try {
      await supabase.functions.invoke('signal-notification-dispatcher', {
        body: {
          signal_id: signalId,
          message,
          notification_type: 'signal_update'
        }
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  // Update signal analytics
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
      await supabase
        .from('educator_signal_analytics')
        .upsert({
          educator_id: user?.id,
          signal_id: signalId,
          ...updates,
          updated_at: new Date().toISOString()
        });
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

      // Set up real-time subscriptions
      const analyticsChannel = supabase
        .channel('educator-analytics')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'educator_signal_analytics',
            filter: `educator_id=eq.${user.id}`
          },
          () => {
            loadAnalytics();
          }
        )
        .subscribe();

      const followersChannel = supabase
        .channel('signal-followers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'signal_followers'
          },
          () => {
            loadFollowers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(analyticsChannel);
        supabase.removeChannel(followersChannel);
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
