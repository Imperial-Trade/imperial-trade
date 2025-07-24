import React from 'react';
import { EconomicRealtimeProvider } from '@/contexts/EconomicRealtimeContext';
import MarketEventsTimeline from './MarketEventsTimeline';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

interface OptimizedEconomicCalendarProps {
  onEventClick?: (event: EconomicEvent) => void;
  className?: string;
}

export default function OptimizedEconomicCalendar({ 
  onEventClick, 
  className = "" 
}: OptimizedEconomicCalendarProps) {
  return (
    <EconomicRealtimeProvider enabled={true} notificationsEnabled={true}>
      <MarketEventsTimeline 
        onEventClick={onEventClick}
        className={className}
      />
    </EconomicRealtimeProvider>
  );
}