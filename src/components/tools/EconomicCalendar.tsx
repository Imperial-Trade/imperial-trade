import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Flag, AlertTriangle, TrendingUp } from 'lucide-react';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  impact: 'low' | 'medium' | 'high';
  forecast: string;
  previous: string;
  actual?: string;
  currency: string;
}

const EconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterImpact, setFilterImpact] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const mockEvents: EconomicEvent[] = [
    {
      id: '1',
      date: '2024-01-15',
      time: '13:30',
      country: 'US',
      event: 'Consumer Price Index (CPI) m/m',
      impact: 'high',
      forecast: '0.3%',
      previous: '0.2%',
      currency: 'USD'
    },
    {
      id: '2',
      date: '2024-01-15',
      time: '15:00',
      country: 'US',
      event: 'Retail Sales m/m',
      impact: 'medium',
      forecast: '0.4%',
      previous: '0.6%',
      currency: 'USD'
    }
  ];

  useEffect(() => {
    setEvents(mockEvents);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Economic Calendar
        </h2>
        <p className="text-muted-foreground">
          Stay ahead of market-moving events and economic announcements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Today's Events</p>
            <p className="text-2xl font-bold">{events.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Market Impact Guide</p>
              <p className="text-blue-600 dark:text-blue-400">
                Economic events are categorized by their potential market impact. High impact events typically cause significant price movements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EconomicCalendar;