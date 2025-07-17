import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export const PerformanceChart: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Card className={cn(
      "h-96",
      theme === 'dark' 
        ? "bg-slate-900/80 border-slate-700" 
        : "bg-white border-slate-200"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Trading Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Performance analytics coming soon</p>
            <p className="text-sm">Start trading to see your progress</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};