import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePipsForSignal } from '@/utils/pipsCalculator';
import { useEffect } from 'react';

export interface TopProvider {
  rank: 1 | 2 | 3;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  userType: 'admin' | 'educator+' | 'educator' | 'moderator';
  totalPips: number;
  signalCount: number;
  winRate: number;
}

interface ProviderStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  userType: 'admin' | 'educator+' | 'educator' | 'moderator';
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

      console.log('🔍 Top Providers Query - Date Range:', {
        twentyFourHoursAgo: twentyFourHoursAgoISO,
        now: new Date().toISOString(),
        signalCount: signals?.length || 0
      });

      if (signalsError) throw signalsError;
      if (!signals || signals.length === 0) return [];

      // Fetch educator profiles
      const educatorIds = [...new Set(signals.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', educatorIds);

      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Fetch user roles from user_roles table (secure)
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', educatorIds);

      if (rolesError) throw rolesError;

      console.log('🔍 Top Providers - User Roles:', {
        totalRoles: userRolesData?.length || 0,
        rolesMap: userRolesData?.map(ur => ({ userId: ur.user_id, role: ur.role }))
      });

      // Create a map of userId -> highest priority role
      const userRolesMap = new Map<string, 'admin' | 'educator+' | 'educator' | 'moderator'>();
      userRolesData?.forEach(ur => {
        const currentRole = userRolesMap.get(ur.user_id);
        // Priority: admin > educator+ > moderator > educator
        if (!currentRole || 
            (ur.role === 'admin') ||
            (ur.role === 'educator+' && currentRole !== 'admin') ||
            (ur.role === 'moderator' && !['admin', 'educator+'].includes(currentRole)) ||
            (ur.role === 'educator' && !['admin', 'educator+', 'moderator'].includes(currentRole))) {
          userRolesMap.set(ur.user_id, ur.role as 'admin' | 'educator+' | 'educator' | 'moderator');
        }
      });

      // Calculate stats for each provider
      const providerStats = new Map<string, ProviderStats>();

      profiles.forEach(profile => {
        const role = userRolesMap.get(profile.id);
        
        // Only include users with signal creation privileges
        if (!role || !['admin', 'educator+', 'educator', 'moderator'].includes(role)) {
          return;
        }

        providerStats.set(profile.id, {
          userId: profile.id,
          displayName: profile.display_name || 'Unknown Educator',
          avatarUrl: profile.avatar_url,
          userType: role,
          totalPips: 0,
          signalCount: 0,
          winningSignals: 0
        });
      });

      console.log('🔍 Top Providers - Initial Provider Stats:', {
        totalProviders: providerStats.size,
        providers: Array.from(providerStats.entries()).map(([id, stats]) => ({
          id,
          name: stats.displayName,
          role: stats.userType
        }))
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
            try {
              const pipsData = calculatePipsForSignal(
                signal.entry_price,
                targetPrice,
                signal.tradermade_symbol,
                signal.trade_type
              );

              console.log(`💰 Pip calculation for signal ${signal.id}:`, {
                provider: stats.displayName,
                entryPrice: signal.entry_price,
                targetPrice,
                symbol: signal.tradermade_symbol,
                tradeType: signal.trade_type,
                pipsData
              });

              if (pipsData.direction === 'profit') {
                stats.totalPips += pipsData.value;
                stats.winningSignals++;
              }
            } catch (error) {
              console.error(`❌ Pip calculation error for signal ${signal.id}:`, error);
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

      console.log('🔍 Top Providers - After Pip Calculation:', {
        providers: Array.from(providerStats.entries()).map(([id, stats]) => ({
          id,
          name: stats.displayName,
          role: stats.userType,
          totalPips: stats.totalPips,
          signalCount: stats.signalCount,
          winningSignals: stats.winningSignals
        }))
      });

      // Convert to array and sort by total pips
      const sortedProviders = Array.from(providerStats.values())
        .filter(p => p.signalCount > 0)
        .sort((a, b) => b.totalPips - a.totalPips)
        .slice(0, 3);

      // Add ranks and calculate win rates
      const finalResults = sortedProviders.map((provider, index) => ({
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

      console.log('🔍 Top Providers - Final Sorted Results:', finalResults);
      
      return finalResults;
    },
    staleTime: 0, // Force fresh data for debugging
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    gcTime: 0, // Don't cache at all for debugging
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
