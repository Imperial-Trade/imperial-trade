import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import MarketEventCard from './MarketEventCard';
import MarketEventFilters from './MarketEventFilters';
import MarketEventStats from './MarketEventStats';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

interface MarketEventsTimelineProps {
  onEventClick?: (event: EconomicEvent) => void;
  className?: string;
}

export default function MarketEventsTimeline({ 
  onEventClick, 
  className = "" 
}: MarketEventsTimelineProps) {
  const {
    filteredEvents,
    isLoading,
    error,
    lastUpdated,
    refreshEvents,
    filters,
    stats
  } = useEconomicCalendar(
    {
      dateFrom: format(new Date(), 'yyyy-MM-dd'),
      dateTo: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'],
      impacts: ['high', 'medium', 'low']
    },
    {
      autoRefresh: true,
      refreshInterval: 300000, // 5 minutes
      maxRetries: 3
    }
  );

  return (
    <div className={`min-h-screen bg-background/95 p-6 ${className}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Market Events Timeline</h1>
          <p className="text-muted-foreground">
            Stay ahead of market-moving economic events with AI-powered volatility forecasts
          </p>
        </div>

        {/* Filters */}
        <MarketEventFilters
          dateRange={filters.dateRange}
          onDateRangeChange={filters.setDateRange}
          currency={filters.currency}
          onCurrencyChange={filters.setCurrency}
          impact={filters.impact}
          onImpactChange={filters.setImpact}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          onRefresh={refreshEvents}
        />

        {/* Events Timeline */}
        <Card className="bg-card/50 border-border/30 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Economic Events
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredEvents.length} events)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <EnhancedLoading message="Loading market events..." />
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4 text-lg">{error.message}</p>
                <button 
                  onClick={refreshEvents}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No economic events found</p>
                <p className="text-muted-foreground/70">Try adjusting your filters to see more events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map(event => (
                  <MarketEventCard
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Footer */}
        <MarketEventStats stats={stats} />
        
      </div>
    </div>
  );
}