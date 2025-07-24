import React, { memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Filter, AlertTriangle, Zap, TrendingUp, RefreshCw, Activity, Wifi, WifiOff } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { EconomicRealtimeProvider } from '@/contexts/EconomicRealtimeContext';
import { EconomicLiveFeed } from './EconomicLiveFeed';
import { EconomicEventCountdown } from './EconomicEventCountdown';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

// Memoized components for better performance
const EventCard = memo(({ event, onEventClick }: { 
  event: EconomicEvent; 
  onEventClick?: (event: EconomicEvent) => void;
}) => {
  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'high': return 'bg-accent-red/10 text-accent-red border-accent-red/20';
      case 'medium': return 'bg-accent-gold/10 text-accent-gold border-accent-gold/20';
      case 'low': return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      default: return 'bg-muted/10 text-muted-foreground border-border';
    }
  }, []);

  const getImpactIcon = useCallback((impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-3 h-3" />;
      case 'medium': return <AlertTriangle className="w-3 h-3" />;
      case 'low': return <TrendingUp className="w-3 h-3" />;
      default: return null;
    }
  }, []);

  const formatEventDate = useCallback((dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'E, MMM d');
  }, []);

  const getTimeUntilEvent = useCallback((eventTime: string, eventDate: string) => {
    const now = new Date();
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours, minutes, 0, 0);
    
    const diff = eventDateTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return 'Past';
    if (hoursUntil === 0) return `${minutesUntil}m`;
    if (hoursUntil < 24) return `${hoursUntil}h ${minutesUntil}m`;
    return `${Math.floor(hoursUntil / 24)}d`;
  }, []);

  return (
    <div 
      className="p-4 bg-card/50 border border-border/50 rounded-lg hover:bg-card/70 transition-colors cursor-pointer"
      onClick={() => onEventClick?.(event)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${getImpactColor(event.impact)} flex items-center gap-1 text-xs`}>
            {getImpactIcon(event.impact)}
            {event.impact.toUpperCase()}
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            {event.currency}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatEventDate(event.date)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{event.time}</span>
          <span className="text-accent-green ml-1 text-xs">
            ({getTimeUntilEvent(event.time, event.date)})
          </span>
        </div>
      </div>
      
      <h4 className="font-medium text-foreground mb-1 line-clamp-2">{event.event}</h4>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
      
      <div className="flex gap-4 text-xs">
        {event.previous && (
          <div>
            <span className="text-muted-foreground">Prev: </span>
            <span className="text-foreground">{event.previous}</span>
          </div>
        )}
        {event.forecast && (
          <div>
            <span className="text-muted-foreground">Forecast: </span>
            <span className="text-foreground">{event.forecast}</span>
          </div>
        )}
        {event.actual && (
          <div>
            <span className="text-muted-foreground">Actual: </span>
            <span className="text-accent-green font-medium">{event.actual}</span>
          </div>
        )}
      </div>
    </div>
  );
});

const StatsCard = memo(({ title, value, color }: { 
  title: string; 
  value: number; 
  color: string; 
}) => (
  <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
    <CardContent className="p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </CardContent>
  </Card>
));

interface OptimizedEconomicCalendarProps {
  onEventClick?: (event: EconomicEvent) => void;
  className?: string;
}

export default function OptimizedEconomicCalendar({ 
  onEventClick, 
  className = "" 
}: OptimizedEconomicCalendarProps) {
  const {
    filteredEvents,
    isLoading,
    error,
    lastUpdated,
    retryCount,
    refreshEvents,
    clearCache,
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

  const isOnline = navigator.onLine;

  const handleClearCache = useCallback(() => {
    clearCache();
    refreshEvents();
  }, [clearCache, refreshEvents]);

  const memoizedStatsCards = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard title="High Impact" value={stats.high} color="text-accent-red" />
      <StatsCard title="Medium Impact" value={stats.medium} color="text-accent-gold" />
      <StatsCard title="Low Impact" value={stats.low} color="text-accent-green" />
      <StatsCard title="Total Events" value={stats.total} color="text-primary" />
    </div>
  ), [stats]);

  const memoizedFilters = useMemo(() => (
    <div className="flex flex-wrap gap-2 md:gap-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filters.dateRange} onValueChange={filters.setDateRange}>
          <SelectTrigger className="w-32 md:w-40 bg-background border-border">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="next_week">Next Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="next_month">Next Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Select value={filters.currency} onValueChange={filters.setCurrency}>
        <SelectTrigger className="w-24 md:w-32 bg-background border-border">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="USD">🇺🇸 USD</SelectItem>
          <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
          <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
          <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
          <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={filters.impact} onValueChange={filters.setImpact}>
        <SelectTrigger className="w-28 md:w-40 bg-background border-border">
          <SelectValue placeholder="Impact" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Impact</SelectItem>
          <SelectItem value="high">🌶️🌶️🌶️ High</SelectItem>
          <SelectItem value="medium">🌶️🌶️ Medium</SelectItem>
          <SelectItem value="low">🌶️ Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ), [filters]);

  return (
    <EconomicRealtimeProvider enabled={true} notificationsEnabled={true}>
      <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 md:p-6 ${className}`}>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Summary Cards */}
          {memoizedStatsCards}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Feed Sidebar */}
            <div className="lg:col-span-1">
              <EconomicLiveFeed />
            </div>

            {/* Main Calendar */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="calendar" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="calendar">📅 Calendar View</TabsTrigger>
                  <TabsTrigger value="live">📊 Live Events</TabsTrigger>
                </TabsList>
                
                <TabsContent value="calendar" className="mt-6">
                  <Card className="bg-card/50 border-border/50 shadow-2xl backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Economic Calendar
                          {!isOnline && (
                            <Badge variant="destructive" className="ml-2">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Offline
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                          >
                            <Activity className="w-4 h-4" />
                            Live Updates
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        {memoizedFilters}
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={refreshEvents} 
                            disabled={isLoading || !isOnline} 
                            variant="outline" 
                            size="sm" 
                            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">Refresh</span>
                          </Button>
                          <Button 
                            onClick={handleClearCache} 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Clear Cache
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                        {lastUpdated && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Last updated: {format(lastUpdated, 'HH:mm:ss')}
                            {isOnline ? (
                              <Wifi className="w-3 h-3 text-accent-green" />
                            ) : (
                              <WifiOff className="w-3 h-3 text-destructive" />
                            )}
                          </p>
                        )}
                        {retryCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Retry attempts: {retryCount}
                          </p>
                        )}
                      </div>

                      {/* Events List */}
                      {isLoading ? (
                        <EnhancedLoading message="Loading economic events..." />
                      ) : error ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                          <p className="text-destructive mb-2">{error.message}</p>
                          <Button onClick={refreshEvents} variant="outline" size="sm">
                            Retry
                          </Button>
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-muted-foreground">No economic events found for the selected criteria</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {filteredEvents.map(event => (
                            <div key={event.id} className="flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-lg hover:bg-card/70 transition-colors cursor-pointer" onClick={() => onEventClick?.(event)}>
                              <EventCard 
                                event={event} 
                                onEventClick={onEventClick}
                              />
                              <div className="flex-shrink-0 ml-4">
                                <EconomicEventCountdown 
                                  event={event} 
                                  variant="compact"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="live" className="mt-6">
                  <Card className="bg-card/50 border-border/50 shadow-2xl backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Live Economic Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredEvents
                          .filter(event => {
                            const now = new Date();
                            const eventDate = new Date(`${event.date} ${event.time}`);
                            const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                            return hoursUntil >= -1 && hoursUntil <= 24; // Show events from 1 hour ago to 24 hours ahead
                          })
                          .sort((a, b) => {
                            const dateA = new Date(`${a.date} ${a.time}`);
                            const dateB = new Date(`${b.date} ${b.time}`);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .map(event => (
                            <div 
                              key={event.id}
                              className="flex items-center justify-between p-4 bg-card/30 border border-border/30 rounded-lg hover:bg-card/50 transition-colors"
                            >
                              <div className="flex-1">
                                <EventCard event={event} onEventClick={onEventClick} />
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                <EconomicEventCountdown 
                                  event={event} 
                                  variant="detailed"
                                />
                              </div>
                            </div>
                          ))}
                        {filteredEvents.filter(event => {
                          const now = new Date();
                          const eventDate = new Date(`${event.date} ${event.time}`);
                          const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                          return hoursUntil >= -1 && hoursUntil <= 24;
                        }).length === 0 && (
                          <div className="text-center py-8">
                            <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-muted-foreground">No live events in the next 24 hours</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </EconomicRealtimeProvider>
  );
}