import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Filter, AlertTriangle, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isTomorrow, parseISO } from 'date-fns';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
  actual?: string;
  description: string;
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [selectedImpact, setSelectedImpact] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock economic events data
  const mockEvents: EconomicEvent[] = [
    {
      id: '1',
      date: new Date().toISOString(),
      time: '08:30',
      currency: 'USD',
      event: 'Non-Farm Payrolls',
      impact: 'high',
      forecast: '185K',
      previous: '175K',
      actual: '190K',
      description: 'Monthly change in the number of employed people during the previous month, excluding farm workers, government employees, private household employees and non-profit employees.'
    },
    {
      id: '2',
      date: new Date().toISOString(),
      time: '10:00',
      currency: 'EUR',
      event: 'Eurozone GDP',
      impact: 'high',
      forecast: '0.1%',
      previous: '0.2%',
      description: 'Quarterly gross domestic product growth rate for the Eurozone.'
    },
    {
      id: '3',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '14:00',
      currency: 'GBP',
      event: 'Bank of England Interest Rate Decision',
      impact: 'high',
      forecast: '5.25%',
      previous: '5.25%',
      description: 'Interest rate decision by the Bank of England Monetary Policy Committee.'
    },
    {
      id: '4',
      date: new Date().toISOString(),
      time: '09:30',
      currency: 'USD',
      event: 'Consumer Price Index',
      impact: 'medium',
      forecast: '3.2%',
      previous: '3.1%',
      description: 'Monthly change in the price of goods and services purchased by consumers.'
    },
    {
      id: '5',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      time: '13:30',
      currency: 'CAD',
      event: 'Employment Change',
      impact: 'medium',
      forecast: '25K',
      previous: '22K',
      description: 'Change in the number of employed people during the previous month.'
    }
  ];

  useEffect(() => {
    loadEconomicEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedDate, selectedCurrency, selectedImpact]);

  const loadEconomicEvents = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEvents(mockEvents);
      setLastUpdated(new Date());
    } catch (error) {
      setError('Failed to load economic events. Using cached data.');
      setEvents(mockEvents);
    }
    setIsLoading(false);
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter by date
    const now = new Date();
    switch (selectedDate) {
      case 'today':
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.date);
          return isToday(eventDate);
        });
        break;
      case 'this_week':
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.date);
          return eventDate >= startOfWeek(now) && eventDate <= endOfWeek(now);
        });
        break;
      case 'next_week':
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.date);
          return eventDate >= startOfWeek(nextWeek) && eventDate <= endOfWeek(nextWeek);
        });
        break;
      case 'this_month':
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.date);
          return eventDate >= startOfMonth(now) && eventDate <= endOfMonth(now);
        });
        break;
      case 'next_month':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        filtered = filtered.filter(event => {
          const eventDate = parseISO(event.date);
          return eventDate >= startOfMonth(nextMonth) && eventDate <= endOfMonth(nextMonth);
        });
        break;
    }

    // Filter by currency
    if (selectedCurrency !== 'all') {
      filtered = filtered.filter(event => event.currency === selectedCurrency);
    }

    // Filter by impact
    if (selectedImpact !== 'all') {
      filtered = filtered.filter(event => event.impact === selectedImpact);
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredEvents(filtered);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/10 text-accent-red border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-accent-gold border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-accent-green border-green-500/20';
      default: return 'bg-gray-500/10 text-secondary border-gray-500/20';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-3 h-3" />;
      case 'medium': return <AlertTriangle className="w-3 h-3" />;
      case 'low': return <TrendingUp className="w-3 h-3" />;
      default: return null;
    }
  };

  const getActualColor = (actual: string | undefined, forecast: string, previous: string) => {
    if (!actual) return 'text-secondary';
    
    // Simple comparison - in real app, would need proper numeric parsing
    const actualNum = parseFloat(actual.replace(/[^\d.-]/g, ''));
    const forecastNum = parseFloat(forecast.replace(/[^\d.-]/g, ''));
    
    if (isNaN(actualNum) || isNaN(forecastNum)) return 'text-primary';
    
    if (actualNum > forecastNum) return 'text-accent-green';
    if (actualNum < forecastNum) return 'text-accent-red';
    return 'text-primary';
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'E, MMM d');
  };

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-black dark:via-gray-900 dark:to-black min-h-screen">
      <div className="p-6 space-y-6">
        <Card className="bg-white dark:bg-gray-900/30 border-transparent dark:shadow-2xl dark:shadow-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Economic Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-secondary" />
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="w-40 bg-surface border-default">
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
                
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-32 bg-surface border-default">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedImpact} onValueChange={setSelectedImpact}>
                  <SelectTrigger className="w-32 bg-surface border-default">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Impact</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={loadEconomicEvents} disabled={isLoading} variant="outline" size="sm" className="border-default text-secondary hover:bg-surface hover:text-primary">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {lastUpdated && (
              <p className="text-xs text-secondary flex items-center gap-2 mb-4">
                <Clock className="w-3 h-3" />
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </p>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
              </div>
            ) : error && events.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={loadEconomicEvents} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-secondary/50 mx-auto mb-4" />
                <p className="text-secondary">No events found for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map(event => (
                  <Card key={event.id} className="bg-background dark:bg-gray-900/30 border-border dark:border-gray-600/20 backdrop-blur-sm hover:border-border dark:hover:border-gray-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {event.currency}
                            </Badge>
                            <Badge className={`${getImpactColor(event.impact)} border flex items-center gap-1`}>
                              {getImpactIcon(event.impact)}
                              {event.impact.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-secondary flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </span>
                            <span className="text-sm text-secondary">
                              {formatEventDate(event.date)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-primary text-lg mb-1">{event.event}</h3>
                          <p className="text-sm text-secondary">{event.description}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center lg:text-right">
                          <div>
                            <p className="text-xs text-secondary uppercase tracking-wide">Previous</p>
                            <p className="font-semibold text-primary">{event.previous || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary uppercase tracking-wide">Forecast</p>
                            <p className="font-semibold text-primary">{event.forecast || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary uppercase tracking-wide">Actual</p>
                            <p className={`font-bold ${getActualColor(event.actual, event.forecast, event.previous)}`}>
                              {event.actual || 'Pending'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-background dark:bg-gray-900/30 border-border dark:border-gray-600/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-secondary">High Impact</p>
              <p className="text-2xl font-bold text-primary">
                {filteredEvents.filter(e => e.impact === 'high').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background dark:bg-gray-900/30 border-border dark:border-gray-600/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-secondary">Medium Impact</p>
              <p className="text-2xl font-bold text-primary">
                {filteredEvents.filter(e => e.impact === 'medium').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background dark:bg-gray-900/30 border-border dark:border-gray-600/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-secondary">Low Impact</p>
              <p className="text-2xl font-bold text-primary">
                {filteredEvents.filter(e => e.impact === 'low').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background dark:bg-gray-900/30 border-border dark:border-gray-600/20 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-secondary">Total Events</p>
              <p className="text-2xl font-bold text-primary">{filteredEvents.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}