import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Activity, Flag } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import type { EconomicEvent } from '@/services/EconomicCalendarService';
import EventExplanation from './EventExplanation';
import MarketImpactIndicator from './MarketImpactIndicator';
import RealTimeIndicator from './RealTimeIndicator';
import { 
  getEventDescription, 
  formatValue, 
  getImpactExplanation,
  getTimeUntilEvent,
  formatEventTitle 
} from '@/utils/economicEventHelpers';

interface MarketEventCardProps {
  event: EconomicEvent;
  onEventClick?: (event: EconomicEvent) => void;
}

const MarketEventCard = memo(({ event, onEventClick }: MarketEventCardProps) => {
  const eventDescription = getEventDescription(event.event);
  const timeUntilEvent = getTimeUntilEvent(event.date, event.time);
  
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getCountryFlag = (currency: string) => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸',
      'EUR': '🇪🇺', 
      'GBP': '🇬🇧',
      'JPY': '🇯🇵',
      'CHF': '🇨🇭',
      'AUD': '🇦🇺',
      'CAD': '🇨🇦',
      'NZD': '🇳🇿'
    };
    return flags[currency] || '🌐';
  };

  return (
    <div 
      className="bg-card/50 border border-border/30 rounded-lg p-4 hover:bg-card/70 transition-all duration-200 cursor-pointer space-y-4"
      onClick={() => onEventClick?.(event)}
    >
      {/* Header with Real-time Indicator */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-lg">{getCountryFlag(event.currency)}</span>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-1">
              {event.currency}
            </Badge>
          </div>
          <Badge className="bg-muted/20 text-muted-foreground text-xs px-2 py-1">
            <Clock className="w-3 h-3 mr-1" />
            {timeUntilEvent}
          </Badge>
        </div>
        <RealTimeIndicator 
          lastUpdated={new Date().toISOString()}
          isConnected={true}
        />
      </div>

      {/* Human-Readable Event Title */}
      <div>
        <h3 className="font-semibold text-foreground mb-1 text-base">
          {eventDescription.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {eventDescription.explanation}
        </p>
      </div>

      {/* Enhanced Impact Indicator */}
      <MarketImpactIndicator 
        impact={event.impact}
        actual={event.actual}
        forecast={event.forecast}
      />

      {/* Human-Readable Economic Data */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-muted/20 rounded-lg">
        {event.previous && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Previous</p>
            <p className="text-sm font-medium text-foreground">
              {formatValue(event.previous, event.event)}
            </p>
          </div>
        )}
        {event.forecast && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Expected</p>
            <p className="text-sm font-medium text-foreground">
              {formatValue(event.forecast, event.event)}
            </p>
          </div>
        )}
        {event.actual && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Actual Result</p>
            <p className="text-sm font-medium text-green-400">
              {formatValue(event.actual, event.event)}
            </p>
          </div>
        )}
      </div>

      {/* Impact Explanation */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-sm text-muted-foreground mb-2">
          📊 <span className="font-medium">Market Impact:</span>
        </p>
        <p className="text-sm text-foreground">
          {getImpactExplanation(event.impact, event.actual, event.forecast)}
        </p>
      </div>

      {/* Trader-Friendly Tips */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-medium text-blue-400 mb-1">Trading Tip</p>
            <p className="text-sm text-muted-foreground">
              {eventDescription.traderImpact}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Explanation */}
      <EventExplanation eventName={event.event} />
    </div>
  );
});

MarketEventCard.displayName = 'MarketEventCard';

export default MarketEventCard;