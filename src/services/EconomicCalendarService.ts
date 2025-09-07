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
  async getEconomicEvents(request: EconomicCalendarRequest = {}): Promise<EconomicEvent[]> {
    console.log('Economic Calendar service is coming soon', { request });
    // No tradermade calls or edge function invocations
    return [];
  }

  clearCache(): void {
    console.log('Economic Calendar cache clearing is coming soon');
  }
}

export const economicCalendarService = new EconomicCalendarService();