// src/hooks/useLivePrice.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLivePrice(symbol: string) {
  const [livePrice, setLivePrice] = useState<number | null>(null);

  useEffect(() => {
    // Guard against running if no symbol is provided.
    if (!symbol) return;

    // 1. DEFINE THE CHANNEL: This name MUST EXACTLY MATCH the channel name in the Edge Function.
    const channel = supabase.channel('live-prices-broadcast');

    // 2. SET UP THE LISTENER: We tell the channel to listen for 'broadcast' messages
    // that have our specific 'event' name.
    channel.on('broadcast', { event: 'price_update' }, ({ payload }) => {
      // When a message arrives, we check if it's for the symbol this component cares about.
      if (payload.symbol === symbol) {
        setLivePrice(payload.price);
      }
    });

    // 3. SUBSCRIBE TO THE CHANNEL: This actively opens the connection.
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to real-time prices for ${symbol}.`);
      }
    });

    // 4. CLEANUP: This is critical. When the component unmounts (e.g., user navigates away),
    // we must unsubscribe from the channel to prevent memory leaks and unnecessary connections.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]); // The hook will re-run if the 'symbol' prop changes.

  return livePrice;
}