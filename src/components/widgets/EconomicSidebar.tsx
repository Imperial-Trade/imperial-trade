
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import EconomicCalendarWidget from './EconomicCalendarWidget';
import EconomicEventCountdown from './EconomicEventCountdown';

interface EconomicSidebarProps {
  className?: string;
}

export default function EconomicSidebar({ className = '' }: EconomicSidebarProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Card className="bg-surface/50 border-default">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Market Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <EconomicEventCountdown />
          <EconomicCalendarWidget 
            variant="compact" 
            maxEvents={3} 
            showOnlyHighImpact={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
