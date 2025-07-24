import React from 'react';
import { EconomicRealtimeProvider } from '@/contexts/EconomicRealtimeContext';
import MarketEventsTimeline from './MarketEventsTimeline';
import type { EconomicEvent } from '@/services/EconomicCalendarService';
import { triggerEconomicEventsFetch } from '@/utils/testEconomicFetch';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface OptimizedEconomicCalendarProps {
  onEventClick?: (event: EconomicEvent) => void;
  className?: string;
}

export default function OptimizedEconomicCalendar({ 
  onEventClick, 
  className = "" 
}: OptimizedEconomicCalendarProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFetchEvents = async () => {
    setIsLoading(true);
    try {
      await triggerEconomicEventsFetch();
      toast.success('Economic events fetched successfully!');
    } catch (error) {
      console.error('Failed to fetch economic events:', error);
      toast.error('Failed to fetch economic events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EconomicRealtimeProvider enabled={true} notificationsEnabled={true}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Economic Calendar</h2>
          <Button 
            onClick={handleFetchEvents}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Fetch Latest Events
          </Button>
        </div>
        <MarketEventsTimeline 
          onEventClick={onEventClick}
          className={className}
        />
      </div>
    </EconomicRealtimeProvider>
  );
}