
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
    // Feature disabled to reduce infrastructure costs
    console.log('Economic Calendar is disabled to optimize costs');
    return [];
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const economicCalendarService = new EconomicCalendarService();
