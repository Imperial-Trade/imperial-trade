
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
    <div className={`space-y-4 ${className}`}>
      <Card className="bg-surface/50 border-default">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Market Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EconomicEventCountdown />
          <EconomicCalendarWidget 
            variant="compact" 
            maxEvents={4} 
            showOnlyHighImpact={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
