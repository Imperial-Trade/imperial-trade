import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

interface MarketEventCardProps {
  event: EconomicEvent;
  onEventClick?: (event: EconomicEvent) => void;
}

const MarketEventCard = memo(({ event, onEventClick }: MarketEventCardProps) => {
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getImpactChilis = (impact: string) => {
    switch (impact) {
      case 'high': return '🌶️🌶️🌶️';
      case 'medium': return '🌶️🌶️';
      case 'low': return '🌶️';
      default: return '';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const getActualColor = (actual: string | undefined, forecast: string | undefined) => {
    if (!actual || !forecast) return 'text-blue-400';
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
    if (isNaN(actualNum) || isNaN(forecastNum)) return 'text-blue-400';
    return actualNum > forecastNum ? 'text-green-400' : 'text-red-400';
  };

  // Mock AI volatility data - in real implementation this would come from your AI service
  const mockVolatilityForecast = {
    confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
    expectedSwing: Math.random() * 0.5 + 0.1, // 0.1-0.6%
    affectedPairs: event.currency === 'USD' 
      ? ['EUR/USD', 'GBP/USD', 'USD/JPY'] 
      : event.currency === 'EUR'
      ? ['EUR/USD', 'EUR/GBP', 'EUR/JPY']
      : [`${event.currency}/USD`]
  };

  return (
    <div 
      className="bg-card/50 border border-border/30 rounded-lg p-4 hover:bg-card/70 transition-all duration-200 cursor-pointer"
      onClick={() => onEventClick?.(event)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-muted/20 text-muted-foreground text-xs px-2 py-1">
            {event.time}
          </Badge>
          <Badge className={`${getImpactColor(event.impact)} text-xs px-2 py-1 border`}>
            {getImpactChilis(event.impact)} {event.impact.toUpperCase()}
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-1">
            {event.currency}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatEventDate(event.date)}
        </span>
      </div>

      {/* Event Title */}
      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
        {event.event}
      </h3>

      {/* Economic Data */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/20 rounded-lg">
        {event.previous && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Previous</p>
            <p className="text-sm font-medium text-foreground">{event.previous}</p>
          </div>
        )}
        {event.forecast && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Forecast</p>
            <p className="text-sm font-medium text-foreground">{event.forecast}</p>
          </div>
        )}
        {event.actual && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Actual</p>
            <p className={`text-sm font-medium ${getActualColor(event.actual, event.forecast)}`}>
              {event.actual}
            </p>
          </div>
        )}
      </div>

      {/* AI Volatility Forecast */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">AI Volatility Forecast</span>
          <Badge className="bg-purple-500/20 text-purple-300 text-xs">
            {mockVolatilityForecast.confidence}% Confidence
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Expected Price Swing:</span>
            <span className="text-sm font-medium text-foreground">
              ±{mockVolatilityForecast.expectedSwing.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Affected Pairs:</span>
            <div className="flex gap-1">
              {mockVolatilityForecast.affectedPairs.slice(0, 2).map((pair, index) => (
                <Badge key={index} className="bg-muted/20 text-muted-foreground text-xs">
                  {pair}
                </Badge>
              ))}
              {mockVolatilityForecast.affectedPairs.length > 2 && (
                <Badge className="bg-muted/20 text-muted-foreground text-xs">
                  +{mockVolatilityForecast.affectedPairs.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MarketEventCard.displayName = 'MarketEventCard';

export default MarketEventCard;