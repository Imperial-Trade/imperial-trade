import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EconomicEvent } from '@/services/EconomicCalendarService';

interface EconomicEventCountdownProps {
  event: EconomicEvent;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export const EconomicEventCountdown: React.FC<EconomicEventCountdownProps> = ({
  event,
  showIcon = true,
  variant = 'default'
}) => {
  return (
    <div className="text-center py-8">
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Economic Events Coming Soon</h3>
      <p className="text-sm text-muted-foreground">
        Event tracking and countdown functionality will be available soon.
      </p>
      <Badge variant="outline" className="mt-3">Coming Soon</Badge>
    </div>
  );
};