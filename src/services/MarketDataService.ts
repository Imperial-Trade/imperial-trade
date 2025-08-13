
import { supabase } from '@/integrations/supabase/client';

export interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  dataSource?: 'twelve_data' | 'alpha_vantage' | 'yahoo_finance' | 'mock';
  dataQuality?: 'real_time' | 'delayed' | 'simulated';
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    ma200?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    stochastic?: number;
    williamsR?: number;
    support?: number;
    resistance?: number;
  };
  marketContext?: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume_profile: 'above_average' | 'below_average' | 'normal';
    assetClass: 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs';
  };
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

export interface EnhancedMarketDataRequest {
  symbols?: string[];
  includeVolume?: boolean;
  includeTechnicals?: boolean;
}

export interface HistoricalDataRequest {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  startDate: string;
  endDate: string;
}

export interface EnhancedMarketDataResponse {
  prices: MarketDataPoint[];
  dataQuality: 'real_time' | 'delayed' | 'simulated' | 'cached';
  marketHours: boolean;
  totalSymbols: number;
  cacheHitRatio?: number;
  warning?: string;
}

class MarketDataService {
  private cache = new Map<string, { data: MarketDataPoint[], timestamp: number }>();
  private cacheTTL = 5000; // 5 seconds cache for enhanced real-time performance

  async getEnhancedMarketData(request: EnhancedMarketDataRequest = {}): Promise<EnhancedMarketDataResponse> {
    const cacheKey = JSON.stringify(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        prices: cached.data,
        dataQuality: 'cached',
        marketHours: this.isMarketHours(),
        totalSymbols: cached.data.length,
        cacheHitRatio: 1.0
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-market-data', {
        body: {
          symbols: request.symbols || [],
          includeVolume: request.includeVolume ?? true,
          includeTechnicals: request.includeTechnicals ?? true
        }
      });

      if (error) throw error;

      const response: EnhancedMarketDataResponse = {
        prices: data?.prices || [],
        dataQuality: data?.dataQuality || 'simulated',
        marketHours: data?.marketHours ?? this.isMarketHours(),
        totalSymbols: data?.totalSymbols || 0,
        cacheHitRatio: data?.cacheHitRatio,
        warning: data?.warning
      };
      
      this.cache.set(cacheKey, { 
        data: response.prices, 
        timestamp: Date.now() 
      });
      
      return response;
    } catch (error) {
      console.error('Enhanced MarketDataService error:', error);
      throw new Error(`Failed to fetch enhanced market data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMarketData(request: { symbols: string[]; includeVolume?: boolean }): Promise<MarketDataPoint[]> {
    const response = await this.getEnhancedMarketData({
      symbols: request.symbols,
      includeVolume: request.includeVolume,
      includeTechnicals: true
    });
    
    return response.prices;
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

  private isMarketHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    // Basic market hours check (US markets: 14:30-21:00 UTC, Mon-Fri)
    const isWeekday = utcDay >= 1 && utcDay <= 5;
    const isUSMarketHours = utcHour >= 14 && utcHour < 21;
    
    return isWeekday && isUSMarketHours;
  }

  getDataQualityInfo(): { marketHours: boolean; cacheStatus: string } {
    return {
      marketHours: this.isMarketHours(),
      cacheStatus: `${this.cache.size} cached entries`
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.cacheTTL
    };
  }
}

export const marketDataService = new MarketDataService();
