import React, { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Zap, AlertTriangle, TrendingUp, Globe, BarChart3 } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

interface EconomicEventModalProps {
  event: EconomicEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

const EconomicEventModal = memo(({ event, isOpen, onClose }: EconomicEventModalProps) => {
  if (!event) return null;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-accent-red/10 text-accent-red border-accent-red/20';
      case 'medium': return 'bg-accent-gold/10 text-accent-gold border-accent-gold/20';
      case 'low': return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      default: return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <TrendingUp className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getTimeUntilEvent = (eventTime: string, eventDate: string) => {
    const now = new Date();
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours, minutes, 0, 0);
    
    const diff = eventDateTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return 'Event has passed';
    if (hoursUntil === 0) return `in ${minutesUntil} minutes`;
    if (hoursUntil < 24) return `in ${hoursUntil} hours and ${minutesUntil} minutes`;
    const days = Math.floor(hoursUntil / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  };

  const getActualColor = (actual: string | undefined, forecast: string | undefined) => {
    if (!actual || !forecast) return 'text-foreground';
    
    // Simple comparison - in real app, would need proper numeric parsing
    const actualNum = parseFloat(actual.replace(/[^\d.-]/g, ''));
    const forecastNum = parseFloat(forecast.replace(/[^\d.-]/g, ''));
    
    if (isNaN(actualNum) || isNaN(forecastNum)) return 'text-foreground';
    
    if (actualNum > forecastNum) return 'text-accent-green';
    if (actualNum < forecastNum) return 'text-accent-red';
    return 'text-foreground';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-6 h-6 text-primary" />
            Economic Event Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${getImpactColor(event.impact)} flex items-center gap-1`}>
                  {getImpactIcon(event.impact)}
                  {event.impact.toUpperCase()} IMPACT
                </Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Globe className="w-3 h-3 mr-1" />
                  {event.currency}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                </div>
                <p className="text-sm text-primary font-medium">
                  {formatEventDate(event.date)}
                </p>
                <p className="text-xs text-accent-green">
                  {getTimeUntilEvent(event.time, event.date)}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{event.event}</h2>
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            </div>
          </div>

          {/* Data Values */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Economic Data</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {event.previous && (
                  <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">Previous</p>
                    <p className="text-lg font-semibold text-foreground">{event.previous}</p>
                  </div>
                )}
                
                {event.forecast && (
                  <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">Forecast</p>
                    <p className="text-lg font-semibold text-foreground">{event.forecast}</p>
                  </div>
                )}
                
                {event.actual && (
                  <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">Actual</p>
                    <p className={`text-lg font-semibold ${getActualColor(event.actual, event.forecast)}`}>
                      {event.actual}
                    </p>
                    {event.forecast && (
                      <p className="text-xs mt-1">
                        {getActualColor(event.actual, event.forecast) === 'text-accent-green' 
                          ? '↗ Better than expected' 
                          : getActualColor(event.actual, event.forecast) === 'text-accent-red'
                          ? '↘ Worse than expected'
                          : '→ As expected'
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>

              {(!event.previous && !event.forecast && !event.actual) && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Data values will be available closer to the event time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Impact Information */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {getImpactIcon(event.impact)}
                <h3 className="text-lg font-semibold">Market Impact</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Impact Level</p>
                  <p className="text-sm text-muted-foreground">
                    {event.impact === 'high' && 
                      'High impact events typically cause significant market volatility and can trigger major price movements across multiple currency pairs.'}
                    {event.impact === 'medium' && 
                      'Medium impact events may cause moderate market movement and are watched by traders but usually have less dramatic effects.'}
                    {event.impact === 'low' && 
                      'Low impact events typically have minimal effect on markets but can still provide valuable economic context.'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Affected Currency</p>
                  <p className="text-sm text-muted-foreground">
                    This event primarily affects the {event.currency} and related currency pairs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
});

EconomicEventModal.displayName = 'EconomicEventModal';

export default EconomicEventModal;