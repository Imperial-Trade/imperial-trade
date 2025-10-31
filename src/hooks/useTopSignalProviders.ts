import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePipsForSignal } from '@/utils/pipsCalculator';
import { useEffect } from 'react';

export interface TopProvider {
  rank: 1 | 2 | 3;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  userType: 'educator' | 'admin' | 'moderator';
  totalPips: number;
  signalCount: number;
  winRate: number;
}

interface ProviderStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  userType: 'educator' | 'admin' | 'moderator';
  totalPips: number;
  signalCount: number;
  winningSignals: number;
}

export const useTopSignalProviders = () => {
  const { data: topProviders, isLoading, error, refetch } = useQuery({
    queryKey: ['top-signal-providers'],
    queryFn: async () => {
      // Get timestamp for 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

      // Fetch all closed signals from last 24 hours
      const { data: signals, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('status', 'closed')
        .gte('created_at', twentyFourHoursAgoISO);

      if (signalsError) throw signalsError;
      if (!signals || signals.length === 0) return [];

      // Fetch educator profiles
      const educatorIds = [...new Set(signals.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_type, access_level, role')
        .in('id', educatorIds);

      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Calculate stats for each provider
      const providerStats = new Map<string, ProviderStats>();

      profiles.forEach(profile => {
        // Only include educators, admins, and moderators
        const userType = profile.access_level === 'admin' ? 'admin' 
          : profile.access_level === 'moderator' ? 'moderator'
          : profile.user_type === 'educator' ? 'educator'
          : null;

        if (!userType) return;

        providerStats.set(profile.id, {
          userId: profile.id,
          displayName: profile.display_name || 'Unknown Educator',
          avatarUrl: profile.avatar_url,
          userType,
          totalPips: 0,
          signalCount: 0,
          winningSignals: 0
        });
      });

      // Calculate pips for each signal
      signals.forEach(signal => {
        const stats = providerStats.get(signal.user_id);
        if (!stats) return;

        stats.signalCount++;

        // Check if signal has TP hits
        if (signal.tp_hits && signal.tp_hits.length > 0) {
          // Get highest TP hit
          const highestTP = Math.max(...signal.tp_hits);
          const targetPriceKey = `tp${highestTP}` as keyof typeof signal;
          const targetPrice = signal[targetPriceKey] as number;

          if (targetPrice) {
            const pipsData = calculatePipsForSignal(
              signal.entry_price,
              targetPrice,
              signal.tradermade_symbol,
              signal.trade_type
            );

            if (pipsData.direction === 'profit') {
              stats.totalPips += pipsData.value;
              stats.winningSignals++;
            }
          }
        } else if (signal.close_reason === 'stop_loss') {
          // Stop loss hit - calculate negative pips
          const pipsData = calculatePipsForSignal(
            signal.entry_price,
            signal.stop_loss,
            signal.tradermade_symbol,
            signal.trade_type
          );
          // Don't add negative pips to total (losses don't count)
        }
      });

      // Convert to array and sort by total pips
      const sortedProviders = Array.from(providerStats.values())
        .filter(p => p.signalCount > 0)
        .sort((a, b) => b.totalPips - a.totalPips)
        .slice(0, 3);

      // Add ranks and calculate win rates
      return sortedProviders.map((provider, index) => ({
        rank: (index + 1) as 1 | 2 | 3,
        userId: provider.userId,
        displayName: provider.displayName,
        avatarUrl: provider.avatarUrl,
        userType: provider.userType,
        totalPips: provider.totalPips,
        signalCount: provider.signalCount,
        winRate: provider.signalCount > 0 
          ? (provider.winningSignals / provider.signalCount) * 100 
          : 0
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Subscribe to real-time updates on closed signals
  useEffect(() => {
    const channel = supabase
      .channel('top-providers-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trade_alerts',
          filter: 'status=eq.closed'
        },
        () => {
          console.log('Signal closed, refreshing top providers');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    topProviders: topProviders || [],
    isLoading,
    error: error ? String(error) : null,
    refetch
  };
};
