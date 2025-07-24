import { useState, useEffect, useCallback, useMemo } from 'react';
import { economicCalendarService, EconomicEvent, EconomicCalendarRequest } from '@/services/EconomicCalendarService';
import { cacheService } from '@/services/CacheService';
import { useToast } from '@/hooks/use-toast';

interface UseEconomicCalendarOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
  maxRetries?: number;
}

interface UseEconomicCalendarResult {
  events: EconomicEvent[];
  filteredEvents: EconomicEvent[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  retryCount: number;
  refreshEvents: () => Promise<void>;
  clearCache: () => void;
  filters: {
    dateRange: string;
    currency: string;
    impact: string;
    setDateRange: (range: string) => void;
    setCurrency: (currency: string) => void;
    setImpact: (impact: string) => void;
  };
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function useEconomicCalendar(
  request: EconomicCalendarRequest = {},
  options: UseEconomicCalendarOptions = {}
): UseEconomicCalendarResult {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enableRealtime = false,
    maxRetries = 3
  } = options;

  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Filter states
  const [dateRange, setDateRange] = useState('this_week');
  const [currency, setCurrency] = useState('all');
  const [impact, setImpact] = useState('all');

  const { toast } = useToast();

  // Optimized event fetching with request deduplication
  const fetchEvents = useCallback(async () => {
    if (isLoading) return; // Prevent concurrent requests

    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = `economic-events-${JSON.stringify({ ...request, dateRange, currency, impact })}`;
      
      const eventsData = await cacheService.getOrSet(
        cacheKey,
        () => economicCalendarService.getEconomicEvents(request),
        refreshInterval
      );

      setEvents(eventsData);
      setLastUpdated(new Date());
      setRetryCount(0);

      if (eventsData.length > 0) {
        toast({
          title: "Calendar Updated",
          description: `Loaded ${eventsData.length} economic events`,
        });
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to load economic events');
      setError(errorObj);
      setRetryCount(prev => Math.min(prev + 1, maxRetries));

      toast({
        title: "Connection Error",
        description: errorObj.message,
        variant: "destructive",
      });

      // Exponential backoff retry
      if (retryCount < maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(() => {
          fetchEvents();
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [request, isLoading, retryCount, maxRetries, refreshInterval, dateRange, currency, impact, toast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        fetchEvents();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, fetchEvents]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  // Memoized filtered events with optimized filtering
  const filteredEvents = useMemo(() => {
    if (!events.length) {
      console.log('No events available for filtering');
      return [];
    }

    console.log(`Filtering ${events.length} events with filters:`, { dateRange, currency, impact });
    let filtered = [...events];

    // Apply date filtering
    const now = new Date();
    switch (dateRange) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        filtered = filtered.filter(event => event.date.startsWith(today));
        break;
      case 'this_week':
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
        currentWeekEnd.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= currentWeekStart && eventDate <= currentWeekEnd;
        });
        break;
      case 'next_week':
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() - now.getDay() + 7);
        nextWeekStart.setHours(0, 0, 0, 0);
        
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
        });
        break;
    }

    console.log(`After date filtering (${dateRange}): ${filtered.length} events`);

    // Apply currency filtering
    if (currency !== 'all') {
      filtered = filtered.filter(event => event.currency === currency);
      console.log(`After currency filtering (${currency}): ${filtered.length} events`);
    }

    // Apply impact filtering
    if (impact !== 'all') {
      filtered = filtered.filter(event => event.impact === impact);
      console.log(`After impact filtering (${impact}): ${filtered.length} events`);
    }

    // Sort by date and time
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    console.log(`Final filtered and sorted events: ${sorted.length}`);
    return sorted;
  }, [events, dateRange, currency, impact]);

  // Memoized statistics
  const stats = useMemo(() => {
    const high = filteredEvents.filter(e => e.impact === 'high').length;
    const medium = filteredEvents.filter(e => e.impact === 'medium').length;
    const low = filteredEvents.filter(e => e.impact === 'low').length;
    return { 
      total: filteredEvents.length,
      high,
      medium,
      low
    };
  }, [filteredEvents]);

  const clearCache = useCallback(() => {
    cacheService.invalidatePattern('economic-events');
    economicCalendarService.clearCache();
  }, []);

  return {
    events,
    filteredEvents,
    isLoading,
    error,
    lastUpdated,
    retryCount,
    refreshEvents: fetchEvents,
    clearCache,
    filters: {
      dateRange,
      currency,
      impact,
      setDateRange,
      setCurrency,
      setImpact
    },
    stats
  };
}