
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

  // Load educator analytics using RPC call since table types aren't available yet
  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      // Use RPC call to get analytics data
      const { data, error } = await supabase.rpc('get_educator_analytics', {
        educator_user_id: user.id
      });

      if (error) {
        console.error('Error loading analytics:', error);
        return;
      }

      if (data && data.length > 0) {
        setAnalytics(data[0]);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Load signal followers using RPC call
  const loadFollowers = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_educator_followers', {
        educator_user_id: user.id
      });

      if (error) {
        console.error('Error loading followers:', error);
        return;
      }

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

  // Update signal analytics using RPC call
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
      await supabase.rpc('update_educator_signal_analytics', {
        educator_user_id: user?.id,
        signal_uuid: signalId,
        analytics_data: updates
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
