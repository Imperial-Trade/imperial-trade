import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';
import type { EconomicEvent } from '@/services/EconomicCalendarService';

interface MarketEventCardProps {
  event: EconomicEvent;
  onClick?: () => void;
  compact?: boolean;
  showCountdown?: boolean;
}

const MarketEventCard = memo(({ event, onClick, compact = false, showCountdown = true }: MarketEventCardProps) => {
  return (
    <div 
      className={`border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors ${compact ? 'p-3' : ''}`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <h4 className="font-medium text-foreground mb-1">Market Events Coming Soon</h4>
        <p className="text-xs text-muted-foreground">
          Event cards and market impact analysis will be available soon.
        </p>
        <Badge variant="outline" className="mt-2 text-xs">Coming Soon</Badge>
      </div>
    </div>
  );
});

MarketEventCard.displayName = 'MarketEventCard';

export default MarketEventCard;