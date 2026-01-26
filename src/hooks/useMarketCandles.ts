import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type DataSource = 'yahoo' | 'error' | null;

interface UseMarketCandlesReturn {
  candles: CandleData[];
  isLoading: boolean;
  error: string | null;
  source: DataSource;
  fetchCandles: (symbol: string, timeframe: string, count?: number) => Promise<CandleData[]>;
  clearCandles: () => void;
}

export const useMarketCandles = (): UseMarketCandlesReturn => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>(null);

  const fetchCandles = useCallback(async (
    symbol: string, 
    timeframe: string, 
    count: number = 100
  ): Promise<CandleData[]> => {
    console.log('[useMarketCandles] ========== FETCH STARTED ==========');
    console.log('[useMarketCandles] Params:', { symbol, timeframe, count });
    
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useMarketCandles] Fetching ${count} ${timeframe} candles for ${symbol}`);
      console.log('[useMarketCandles] Using direct fetch instead of supabase.functions.invoke...');
      
      // Use direct fetch to bypass potential Supabase client issues
      const url = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/get-market-candles';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi9ZjqitAjQAJbyYnps_sc';
      
      console.log('[useMarketCandles] Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ symbol, timeframe, count })
      });
      
      console.log('[useMarketCandles] ========== RESPONSE RECEIVED ==========');
      console.log('[useMarketCandles] Response status:', response.status);
      console.log('[useMarketCandles] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useMarketCandles] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[useMarketCandles] Parsed data:', data);
      
      const fnError = null; // No error if we got here

      console.log('[useMarketCandles] Parsed - data:', data);
      console.log('[useMarketCandles] Parsed - fnError:', fnError);

      if (data?.error) {
        console.error('[useMarketCandles] API error:', data.error);
        setError(data.error);
        setSource('error');
        setCandles([]);
        return [];
      }
      
      if (data?.candles && data.candles.length > 0) {
        console.log(`[useMarketCandles] Received ${data.candles.length} candles from ${data.source}`);
        setCandles(data.candles);
        setSource(data.source || 'yahoo');
        return data.candles;
      } else {
        console.warn('[useMarketCandles] No candles in response:', data);
        setError('No candles available');
        setCandles([]);
        setSource('error');
        return [];
      }
    } catch (err) {
      console.error('[useMarketCandles] Error:', err);
      setError((err as Error).message || 'Failed to fetch candles');
      setSource('error');
      setCandles([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCandles = useCallback(() => {
    setCandles([]);
    setSource(null);
    setError(null);
  }, []);

  return { candles, isLoading, error, source, fetchCandles, clearCandles };
};

export default useMarketCandles;
