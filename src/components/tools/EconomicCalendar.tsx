import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Calendar, Clock, TrendingUp, AlertTriangle, Zap, RefreshCw, Filter, Globe, ChevronDown } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, addDays, subDays, addMonths, subMonths, startOfDay, isThisWeek, startOfWeek, endOfWeek, addWeeks, isThisMonth, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { economicCalendarService, EconomicEvent } from '@/services/EconomicCalendarService';
export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Updated state for new filters
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const allImpacts: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const allCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
  useEffect(() => {
    loadEconomicEvents();
  }, []);
  useEffect(() => {
    filterEvents();
  }, [events, selectedDate, selectedImpacts, selectedCurrencies]);
  const loadEconomicEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const dateFrom = format(subMonths(today, 1), 'yyyy-MM-dd');
      const dateTo = format(addMonths(today, 1), 'yyyy-MM-dd');
      const eventsData = await economicCalendarService.getEconomicEvents({
        dateFrom,
        dateTo,
        currencies: allCurrencies,
        impacts: allImpacts
      });
      setEvents(eventsData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load economic events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load economic events. Please try again.');

      // Fallback to mock data
      setEvents(generateMockData());
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  // Keep mock data as fallback
  const generateMockData = (): EconomicEvent[] => {
    const today = new Date();
    return [{
      id: '1',
      time: '08:30',
      currency: 'USD',
      impact: 'high',
      event: 'Non-Farm Payrolls',
      actual: '273K',
      forecast: '180K',
      previous: '150K',
      date: today.toISOString(),
      description: 'Change in the number of employed people during the previous month, excluding the farming industry.'
    }, {
      id: '2',
      time: '10:00',
      currency: 'USD',
      impact: 'medium',
      event: 'Unemployment Rate',
      actual: '4.1%',
      forecast: '4.2%',
      previous: '4.2%',
      date: today.toISOString(),
      description: 'Percentage of the total work force that is unemployed and actively seeking employment.'
    }, {
      id: '3',
      time: '09:00',
      currency: 'EUR',
      impact: 'high',
      event: 'ECB Interest Rate Decision',
      actual: '',
      forecast: '4.25%',
      previous: '4.25%',
      date: addDays(today, 7).toISOString(),
      description: 'Interest rate charged on the main refinancing operations.'
    }, {
      id: '4',
      time: '12:30',
      currency: 'CAD',
      impact: 'medium',
      event: 'GDP Growth Rate',
      actual: '',
      forecast: '1.8%',
      previous: '2.1%',
      date: addDays(today, 8).toISOString(),
      description: 'Annualized change in the inflation-adjusted value of all goods and services.'
    }, {
      id: '5',
      time: '14:00',
      currency: 'GBP',
      impact: 'low',
      event: 'Manufacturing PMI',
      actual: '',
      forecast: '48.5',
      previous: '48.0',
      date: addDays(today, 15).toISOString(),
      description: 'Level of a diffusion index based on surveyed purchasing managers in the manufacturing industry.'
    }, {
      id: '6',
      time: '06:00',
      currency: 'JPY',
      impact: 'medium',
      event: 'Core CPI',
      actual: '',
      forecast: '2.8%',
      previous: '2.7%',
      date: addMonths(today, 1).toISOString(),
      description: 'Change in the price of goods and services purchased by consumers, excluding food and energy.'
    }, {
      id: '7',
      time: '11:00',
      currency: 'AUD',
      impact: 'high',
      event: 'RBA Interest Rate Statement',
      actual: '',
      forecast: '3.5%',
      previous: '3.5%',
      date: addMonths(today, 1).toISOString(),
      description: 'Reserve Bank of Australia\'s primary tool for communicating with investors about monetary policy.'
    }, {
      id: '8',
      time: '16:00',
      currency: 'CHF',
      impact: 'low',
      event: 'Retail Sales',
      actual: '0.5%',
      forecast: '0.3%',
      previous: '0.1%',
      date: subMonths(today, 1).toISOString(),
      description: 'Change in the total value of sales at the retail level.'
    }];
  };
  const filterEvents = () => {
    let filtered = [...events];
    const today = startOfDay(new Date());

    // Filter by date
    switch (selectedDate) {
      case 'today':
        filtered = filtered.filter(event => isToday(parseISO(event.date)));
        break;
      case 'this_week':
        filtered = filtered.filter(event => isThisWeek(parseISO(event.date), {
          weekStartsOn: 1
        }));
        break;
      case 'next_week':
        filtered = filtered.filter(event => {
          const startOfNextWeek = startOfWeek(addWeeks(today, 1), {
            weekStartsOn: 1
          });
          const endOfNextWeek = endOfWeek(addWeeks(today, 1), {
            weekStartsOn: 1
          });
          return isWithinInterval(parseISO(event.date), {
            start: startOfNextWeek,
            end: endOfNextWeek
          });
        });
        break;
      case 'this_month':
        filtered = filtered.filter(event => isThisMonth(parseISO(event.date)));
        break;
      case 'next_month':
        filtered = filtered.filter(event => {
          const startOfNextMonth = startOfMonth(addMonths(today, 1));
          const endOfNextMonth = endOfMonth(addMonths(today, 1));
          return isWithinInterval(parseISO(event.date), {
            start: startOfNextMonth,
            end: endOfNextMonth
          });
        });
        break;
      case 'last_month':
        filtered = filtered.filter(event => {
          const startOfLastMonth = startOfMonth(subMonths(today, 1));
          const endOfLastMonth = endOfMonth(subMonths(today, 1));
          return isWithinInterval(parseISO(event.date), {
            start: startOfLastMonth,
            end: endOfLastMonth
          });
        });
        break;
    }

    // Filter by impacts (multi-select)
    if (selectedImpacts.length > 0) {
      filtered = filtered.filter(event => selectedImpacts.includes(event.impact));
    }

    // Filter by currencies (multi-select)
    if (selectedCurrencies.length > 0) {
      filtered = filtered.filter(event => selectedCurrencies.includes(event.currency));
    }
    setFilteredEvents(filtered);
  };
  const handleMultiSelectChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
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
        return <Globe className="w-4 h-4 text-gray-500" />;
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
  const getActualColor = (actual?: string, forecast?: string, previous?: string) => {
    if (!actual || !forecast) return 'text-secondary';
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
    if (actualNum > forecastNum) return 'text-accent-green';
    if (actualNum < forecastNum) return 'text-accent-red';
    return 'text-secondary';
  };
  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'E, MMM d');
  };
  return <div className="space-y-6 bg-gradient-to-br from-black via-gray-900 to-black min-h-screen p-6">
      <Card className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm shadow-2xl shadow-gray-900/50">
        <CardHeader>
          <div className="flex justify-between items-center">
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
                    <SelectItem value="last_month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-40 bg-surface border-default justify-between">
                          <span>{selectedImpacts.length > 0 ? `${selectedImpacts.length} Impacts` : 'Select Impacts'}</span>
                          <ChevronDown className="w-4 h-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                      <DropdownMenuLabel>Filter by Impact</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allImpacts.map(impact => <DropdownMenuCheckboxItem key={impact} checked={selectedImpacts.includes(impact)} onCheckedChange={() => handleMultiSelectChange(setSelectedImpacts, impact)}>
                              <span className="capitalize">{impact}</span>
                          </DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-40 bg-surface border-default justify-between">
                          <span>{selectedCurrencies.length > 0 ? `${selectedCurrencies.length} Currencies` : 'Select Currencies'}</span>
                          <ChevronDown className="w-4 h-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                      <DropdownMenuLabel>Filter by Currency</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allCurrencies.map(currency => <DropdownMenuCheckboxItem key={currency} checked={selectedCurrencies.includes(currency)} onCheckedChange={() => handleMultiSelectChange(setSelectedCurrencies, currency)}>
                              {currency}
                          </DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Button onClick={loadEconomicEvents} disabled={isLoading} variant="outline" size="sm" className="border-default text-primary hover:bg-surface">
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
          {lastUpdated && <p className="text-xs text-secondary flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Last updated: {format(lastUpdated, 'HH:mm:ss')}
            </p>}
        </CardHeader>
        <CardContent>

          {isLoading ? <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
            </div> : error && events.length === 0 ? <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={loadEconomicEvents} variant="outline">
                Try Again
              </Button>
            </div> : filteredEvents.length === 0 ? <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-secondary/50 mx-auto mb-4" />
              <p className="text-secondary">No events found for the selected filters.</p>
            </div> : <div className="space-y-4">
              {filteredEvents.map(event => <Card key={event.id} className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm hover:border-gray-500/30 transition-colors">
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
                </Card>)}
            </div>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-secondary">High Impact</p>
            <p className="text-2xl font-bold text-primary">
              {filteredEvents.filter(e => e.impact === 'high').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-secondary">Medium Impact</p>
            <p className="text-2xl font-bold text-primary">
              {filteredEvents.filter(e => e.impact === 'medium').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-secondary">Low Impact</p>
            <p className="text-2xl font-bold text-primary">
              {filteredEvents.filter(e => e.impact === 'low').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/30 border-gray-600/20 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-secondary">Total Events</p>
            <p className="text-2xl font-bold text-primary">{filteredEvents.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>;
}