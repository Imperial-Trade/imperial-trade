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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Economic Event Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center py-8">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Economic Event Details Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Detailed event analysis and impact information will be available soon.
          </p>
          <Badge variant="outline" className="mt-3">Coming Soon</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
});

EconomicEventModal.displayName = 'EconomicEventModal';

export default EconomicEventModal;