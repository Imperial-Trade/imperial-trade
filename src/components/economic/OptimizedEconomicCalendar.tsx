import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

interface OptimizedEconomicCalendarProps {
  onEventClick?: (event: any) => void;
  className?: string;
}

export default function OptimizedEconomicCalendar({ 
  className = "" 
}: OptimizedEconomicCalendarProps) {
  return (
    <div className={`min-h-screen bg-background/95 p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card/50 border-border/30 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Economic Calendar
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Advanced market event tracking and analysis
            </p>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                Coming Soon
              </div>
              
              <div className="max-w-md mx-auto space-y-4">
                <p className="text-muted-foreground">
                  We're building an advanced economic calendar with real-time market data, 
                  AI-powered volatility forecasts, and comprehensive event analysis.
                </p>
                
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Real-time economic events
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    AI volatility predictions
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Multi-currency support
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}