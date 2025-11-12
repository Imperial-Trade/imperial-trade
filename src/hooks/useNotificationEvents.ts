import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculatePips, PipsData } from '@/utils/pipsCalculator';

export interface NotificationEvent {
  id: string;
  type: 'new_signal' | 'tp_hit' | 'stop_loss' | 'trade_closed' | 'limit_activated' | 'notes_updated';
  signal_id: string;
  title: string;
  message: string;
  timestamp: Date;
  metadata: {
    provider_name: string;
    provider_avatar_url: string | null;
    provider_type: 'admin' | 'educator' | 'member';
    display_name: string;
    asset_name: string;
    trade_type: string;
    entry_price: number;
    pips_data?: PipsData;
    tp_hits?: number[];
    total_tps?: number;
    progress_percentage?: number;
    tp_number?: number;
    close_reason?: string;
  };
}

interface Signal {
  id: string;
  asset_name: string;
  tradermade_symbol: string;
  trade_type: string;
  entry_price: number;
  stop_loss: number;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tp4: number | null;
  tp5: number | null;
  tp_hits: number[];
  status: string;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  notes: string | null;
  user_id: string;
  profiles: {
    display_name: string;
    real_name: string;
    avatar_url: string | null;
    user_type: 'admin' | 'educator' | 'member';
  };
}

export function useNotificationEvents() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform signal data into notification events
  const transformSignalToEvents = (signal: Signal): NotificationEvent[] => {
    const events: NotificationEvent[] = [];
    
    const providerName = signal.profiles.display_name || signal.profiles.real_name || 'Unknown Trader';
    const displayName = signal.profiles.display_name || signal.profiles.real_name || 'Unknown Trader';
    
    // Count total TPs
    const totalTps = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5]
      .filter(tp => tp !== null && tp !== undefined).length;

    const baseMetadata = {
      provider_name: providerName,
      provider_avatar_url: signal.profiles.avatar_url,
      provider_type: signal.profiles.user_type,
      display_name: displayName,
      asset_name: signal.asset_name,
      trade_type: signal.trade_type,
      entry_price: signal.entry_price,
      total_tps: totalTps,
    };

    // 1. Signal Created Event
    events.push({
      id: `${signal.id}_created`,
      type: 'new_signal',
      signal_id: signal.id,
      title: 'New Signal',
      message: `New ${signal.trade_type.toUpperCase()} signal on ${signal.asset_name}`,
      timestamp: new Date(signal.created_at),
      metadata: {
        ...baseMetadata,
        tp_hits: [],
        progress_percentage: 0,
      },
    });

    // 2. TP Hit Events (for each TP in tp_hits array)
    if (signal.tp_hits && signal.tp_hits.length > 0) {
      signal.tp_hits.forEach((tpNum, index) => {
        const tpPrice = signal[`tp${tpNum}` as keyof Signal] as number;
        
        if (tpPrice) {
          const pipsData = calculatePips(
            signal.entry_price,
            tpPrice,
            signal.trade_type as 'buy' | 'sell',
            signal.tradermade_symbol
          );

          // Estimate timestamp (spread TP hits evenly between created and updated)
          const createdTime = new Date(signal.created_at).getTime();
          const updatedTime = new Date(signal.updated_at).getTime();
          const timeDiff = updatedTime - createdTime;
          const estimatedTime = new Date(createdTime + (timeDiff * (index + 1) / signal.tp_hits.length));

          events.push({
            id: `${signal.id}_tp${tpNum}`,
            type: 'tp_hit',
            signal_id: signal.id,
            title: `TP${tpNum} Hit`,
            message: `TP${tpNum} hit on ${signal.asset_name}`,
            timestamp: estimatedTime,
            metadata: {
              ...baseMetadata,
              pips_data: pipsData,
              tp_hits: signal.tp_hits.slice(0, index + 1),
              tp_number: tpNum,
              progress_percentage: Math.round(((index + 1) / totalTps) * 100),
            },
          });
        }
      });
    }

    // 3. Stop Loss Hit Event
    if (signal.close_reason === 'stop_loss' && signal.status === 'closed') {
      const pipsData = calculatePips(
        signal.entry_price,
        signal.stop_loss,
        signal.trade_type as 'buy' | 'sell',
        signal.tradermade_symbol
      );

      events.push({
        id: `${signal.id}_sl`,
        type: 'stop_loss',
        signal_id: signal.id,
        title: 'Stop Loss Hit',
        message: `Stop loss hit on ${signal.asset_name}`,
        timestamp: new Date(signal.updated_at),
        metadata: {
          ...baseMetadata,
          pips_data: pipsData,
          close_reason: signal.close_reason,
        },
      });
    }

    // 4. Signal Closed Event (for non-SL closes)
    if (signal.status === 'closed' && signal.close_reason !== 'stop_loss') {
      // Calculate pips based on last hit TP or entry
      let finalPrice = signal.entry_price;
      if (signal.tp_hits && signal.tp_hits.length > 0) {
        const lastTp = signal.tp_hits[signal.tp_hits.length - 1];
        finalPrice = signal[`tp${lastTp}` as keyof Signal] as number || signal.entry_price;
      }

      const pipsData = calculatePips(
        signal.entry_price,
        finalPrice,
        signal.trade_type as 'buy' | 'sell',
        signal.tradermade_symbol
      );

      events.push({
        id: `${signal.id}_closed`,
        type: 'trade_closed',
        signal_id: signal.id,
        title: 'Signal Closed',
        message: `${signal.asset_name} signal closed`,
        timestamp: new Date(signal.updated_at),
        metadata: {
          ...baseMetadata,
          pips_data: pipsData,
          tp_hits: signal.tp_hits || [],
          progress_percentage: signal.tp_hits ? Math.round((signal.tp_hits.length / totalTps) * 100) : 0,
          close_reason: signal.close_reason || 'manual',
        },
      });
    }

    // 5. Limit Activated Event
    if (signal.activated_at && signal.trade_type.includes('limit')) {
      events.push({
        id: `${signal.id}_activated`,
        type: 'limit_activated',
        signal_id: signal.id,
        title: 'Limit Activated',
        message: `${signal.trade_type.toUpperCase()} order activated on ${signal.asset_name}`,
        timestamp: new Date(signal.activated_at),
        metadata: baseMetadata,
      });
    }

    return events;
  };

  // Fetch recent signals and transform to events
  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Fetch signals from last 24 hours with user profiles
      const { data: signals, error } = await supabase
        .from('trade_alerts')
        .select(`
          *,
          profiles:user_id (
            display_name,
            real_name,
            avatar_url,
            user_type
          )
        `)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }

      if (!signals) return;

      // Transform all signals into events
      const allEvents: NotificationEvent[] = [];
      signals.forEach((signal: any) => {
        const signalEvents = transformSignalToEvents(signal);
        allEvents.push(...signalEvents);
      });

      // Sort by timestamp (most recent first) and limit to 20
      const sortedEvents = allEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);

      setEvents(sortedEvents);
    } catch (err) {
      console.error('Error in fetchEvents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchEvents();

    // Subscribe to instant-alerts channel for live updates
    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'signal_notification' }, (payload: any) => {
        console.log('🔔 [useNotificationEvents] Received broadcast:', payload);
        
        // Transform broadcast payload to event format
        const data = payload.payload;
        if (!data || !data.signal) return;

        const newEvent: NotificationEvent = {
          id: `${data.signal.id}_${data.type || 'update'}_${Date.now()}`,
          type: (data.type || 'new_signal') as NotificationEvent['type'],
          signal_id: data.signal.id,
          title: data.title || 'Notification',
          message: data.message || '',
          timestamp: new Date(),
          metadata: {
            provider_name: data.signal.author_name || data.metadata?.provider_name || 'Unknown',
            provider_avatar_url: data.signal.author_avatar_url || data.metadata?.provider_avatar_url || null,
            provider_type: (data.signal.author_user_type || data.metadata?.provider_type || 'member') as 'admin' | 'educator' | 'member',
            display_name: data.signal.author_name || data.metadata?.display_name || 'Unknown',
            asset_name: data.signal.asset_name || '',
            trade_type: data.signal.trade_type || 'buy',
            entry_price: data.signal.entry_price || 0,
            pips_data: data.metadata?.pips_data,
            tp_hits: data.signal.tp_hits || [],
            total_tps: data.metadata?.total_tps || 0,
            progress_percentage: data.metadata?.progress_percentage || 0,
            tp_number: data.metadata?.tp_number || data.signal.tp_number,
            close_reason: data.signal.close_reason,
          },
        };

        // Prepend to events list (remove duplicates and limit to 20)
        setEvents((prev) => {
          const filtered = prev.filter(e => e.id !== newEvent.id);
          return [newEvent, ...filtered].slice(0, 20);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading, refresh: fetchEvents };
}

