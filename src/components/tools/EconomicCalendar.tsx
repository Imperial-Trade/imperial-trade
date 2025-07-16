import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar, Clock, Filter, AlertTriangle, Zap, TrendingUp, RefreshCw, Bot, Brain, Activity, Globe } from 'lucide-react';
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
  aiVolatilityForecast?: {
    range: string;
    confidence: number;
    affectedPairs: string[];
  };
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
      description: 'Monthly change in the number of employed people during the previous month, excluding farm workers, government employees, private household employees and non-profit employees.',
      aiVolatilityForecast: {
        range: '±1.2%',
        confidence: 88,
        affectedPairs: ['EURUSD', 'GBPUSD', 'USDJPY']
      }
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
      description: 'Quarterly gross domestic product growth rate for the Eurozone.',
      aiVolatilityForecast: {
        range: '±0.8%',
        confidence: 75,
        affectedPairs: ['EURUSD', 'EURGBP', 'EURJPY']
      }
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
      description: 'Interest rate decision by the Bank of England Monetary Policy Committee.',
      aiVolatilityForecast: {
        range: '±1.5%',
        confidence: 92,
        affectedPairs: ['GBPUSD', 'EURGBP', 'GBPJPY']
      }
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
      case 'high': return 'bg-accent-red/10 text-accent-red border-accent-red/20';
      case 'medium': return 'bg-accent-gold/10 text-accent-gold border-accent-gold/20';
      case 'low': return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      default: return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const getImpactEmoji = (impact: string) => {
    switch (impact) {
      case 'high': return '🌶️🌶️🌶️';
      case 'medium': return '🌶️🌶️';
      case 'low': return '🌶️';
      default: return '';
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
    <div className="bg-background dark:bg-gradient-to-br dark:from-black dark:via-gray-900 dark:to-black min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 border border-border/50 p-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">AI Economic Calendar</h1>
                <p className="text-muted-foreground">Real-time events with AI volatility forecasts</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Market Events Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="w-40 bg-background border-border">
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
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                    <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                    <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
                    <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                    <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedImpact} onValueChange={setSelectedImpact}>
                  <SelectTrigger className="w-40 bg-background border-border">
                    <SelectValue placeholder="Impact Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Impact</SelectItem>
                    <SelectItem value="high">🌶️🌶️🌶️ High</SelectItem>
                    <SelectItem value="medium">🌶️🌶️ Medium</SelectItem>
                    <SelectItem value="low">🌶️ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={loadEconomicEvents} disabled={isLoading} variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {lastUpdated && (
              <p className="text-xs text-muted-foreground flex items-center gap-2 mb-4">
                <Clock className="w-3 h-3" />
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </p>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : error && events.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadEconomicEvents} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No events found for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map(event => (
                  <Card key={event.id} className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-border transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              {event.currency}
                            </Badge>
                            <Badge className={`${getImpactColor(event.impact)} border flex items-center gap-1`}>
                              {getImpactIcon(event.impact)}
                              {getImpactEmoji(event.impact)} {event.impact.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatEventDate(event.date)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground text-lg mb-2">{event.event}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                          
                          {/* AI Volatility Forecast */}
                          {event.aiVolatilityForecast && event.impact === 'high' && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">AI Volatility Forecast</span>
                                <Badge className="bg-primary/10 text-primary text-xs">
                                  {event.aiVolatilityForecast.confidence}% confidence
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Expected price swing: <span className="font-semibold text-foreground">{event.aiVolatilityForecast.range}</span> on major USD pairs
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {event.aiVolatilityForecast.affectedPairs.map(pair => (
                                  <Badge key={pair} variant="outline" className="text-xs">
                                    {pair}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center lg:text-right">
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Previous</p>
                            <p className="font-semibold text-foreground">{event.previous || 'N/A'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Forecast</p>
                            <p className="font-semibold text-foreground">{event.forecast || 'N/A'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Actual</p>
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
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-accent-red/10 w-fit mx-auto mb-3">
                <Zap className="w-6 h-6 text-accent-red" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">🌶️🌶️🌶️ High Impact</p>
              <p className="text-3xl font-bold text-foreground">
                {filteredEvents.filter(e => e.impact === 'high').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-accent-gold/10 w-fit mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-accent-gold" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">🌶️🌶️ Medium Impact</p>
              <p className="text-3xl font-bold text-foreground">
                {filteredEvents.filter(e => e.impact === 'medium').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-accent-green/10 w-fit mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-green" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">🌶️ Low Impact</p>
              <p className="text-3xl font-bold text-foreground">
                {filteredEvents.filter(e => e.impact === 'low').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-3">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Events</p>
              <p className="text-3xl font-bold text-foreground">{filteredEvents.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}