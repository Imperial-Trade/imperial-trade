
import { supabase } from '@/integrations/supabase/client';

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataRequest {
  symbols: string[];
  includeVolume?: boolean;
}

export interface HistoricalDataRequest {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  startDate: string;
  endDate: string;
}

class MarketDataService {
  private cache = new Map<string, { data: MarketDataPoint[], timestamp: number }>();
  private cacheTTL = 15000; // 15 seconds cache

  async getMarketData(request: MarketDataRequest): Promise<MarketDataPoint[]> {
    const cacheKey = JSON.stringify(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-market-data', {
        body: request
      });

      if (error) throw error;

      const marketData = data?.prices || [];
      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      
      return marketData;
    } catch (error) {
      console.error('MarketDataService error:', error);
      throw new Error(`Failed to fetch market data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataPoint[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-historical-data', {
        body: request
      });

      if (error) throw error;

      return data?.historical || [];
    } catch (error) {
      console.error('HistoricalDataService error:', error);
      throw new Error(`Failed to fetch historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const marketDataService = new MarketDataService();
