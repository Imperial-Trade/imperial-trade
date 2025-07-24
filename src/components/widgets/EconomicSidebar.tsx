import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import EconomicCalendarWidget from './EconomicCalendarWidget';
import EconomicEventCountdown from './EconomicEventCountdown';
interface EconomicSidebarProps {
  className?: string;
}
export default function EconomicSidebar({
  className = ''
}: EconomicSidebarProps) {
  return <div className={`space-y-3 ${className}`}>
      
    </div>;
}