
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { economicCalendarService, EconomicEvent } from '@/services/EconomicCalendarService';
import { format, parseISO, isToday } from 'date-fns';

interface EconomicEventCountdownProps {
  className?: string;
}

export default function EconomicEventCountdown({ className = '' }: EconomicEventCountdownProps) {
  const [nextEvent, setNextEvent] = useState<EconomicEvent | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNextEvent();
  }, []);

  useEffect(() => {
    if (!nextEvent) return;

    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = nextEvent.time.split(':').map(Number);
      const eventDateTime = new Date();
      eventDateTime.setHours(hours, minutes, 0, 0);
      
      const diff = eventDateTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown('Event Started');
        loadNextEvent(); // Load next event
        return;
      }
      
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hoursLeft > 0) {
        setCountdown(`${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`);
      } else {
        setCountdown(`${minutesLeft}m ${secondsLeft}s`);
      }
    };

    const interval = setInterval(updateCountdown, 10000);
    updateCountdown();

    return () => clearInterval(interval);
  }, [nextEvent]);

  const loadNextEvent = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dateFrom = format(today, 'yyyy-MM-dd');
      const dateTo = format(today, 'yyyy-MM-dd');
      
      const eventsData = await economicCalendarService.getEconomicEvents({
        dateFrom,
        dateTo,
        currencies: ['USD', 'EUR', 'GBP', 'JPY'],
        impacts: ['high', 'medium']
      });
      
      const todaysEvents = eventsData
        .filter(event => isToday(parseISO(event.date)))
        .sort((a, b) => a.time.localeCompare(b.time));
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const upcomingEvent = todaysEvents.find(event => event.time > currentTime);
      setNextEvent(upcomingEvent || null);
    } catch (err) {
      console.error('Failed to load next event:', err);
      
      // Fallback mock event
      const mockEvent: EconomicEvent = {
        id: '1',
        time: '14:30',
        currency: 'USD',
        impact: 'high',
        event: 'FOMC Meeting',
        actual: '',
        forecast: '',
        previous: '',
        date: new Date().toISOString(),
        description: 'Federal Open Market Committee meeting'
      };
      setNextEvent(mockEvent);
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-surface/50 border-default ${className}`}>
        <CardContent className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!nextEvent) {
    return (
      <Card className={`bg-surface/50 border-default ${className}`}>
        <CardContent className="p-4 text-center">
          <Clock className="w-6 h-6 text-secondary/50 mx-auto mb-2" />
          <p className="text-sm text-secondary">No more events today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-surface/50 border-default ${className}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Badge className={`${getImpactColor(nextEvent.impact)} flex items-center gap-1`}>
              {getImpactIcon(nextEvent.impact)}
              {nextEvent.impact.toUpperCase()}
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              {nextEvent.currency}
            </Badge>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary text-sm mb-1">{nextEvent.event}</h4>
            <p className="text-xs text-secondary">Scheduled at {nextEvent.time}</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-green mb-1">{countdown}</div>
            <p className="text-xs text-secondary">until event</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
