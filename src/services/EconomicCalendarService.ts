
import { supabase } from '@/integrations/supabase/client';

export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  date: string;
  description: string;
}

export interface EconomicCalendarRequest {
  dateFrom?: string;
  dateTo?: string;
  currencies?: string[];
  impacts?: ('high' | 'medium' | 'low')[];
}

class EconomicCalendarService {
  private cache = new Map<string, { data: EconomicEvent[], timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes cache for economic events

  async getEconomicEvents(request: EconomicCalendarRequest = {}): Promise<EconomicEvent[]> {
    const cacheKey = JSON.stringify(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.functions.invoke('economic-calendar', {
        body: request
      });

      if (error) throw error;

      const events = data?.events || [];
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      
      return events;
    } catch (error) {
      console.error('EconomicCalendarService error:', error);
      throw new Error(`Failed to fetch economic events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const economicCalendarService = new EconomicCalendarService();
