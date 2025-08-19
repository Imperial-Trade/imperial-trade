import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinessPlanOptimization } from '@/hooks/useBusinessPlanOptimization';
import { TrendingUp, Zap, Globe, Clock } from 'lucide-react';

export function BusinessPlanIndicator() {
  const { metrics, isOptimized, businessPlanActive } = useBusinessPlanOptimization();

  if (!businessPlanActive || !metrics) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              TraderMade Business Plan
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              metrics.connectionHealth === 'excellent' ? 'bg-green-500' :
              metrics.connectionHealth === 'good' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-muted-foreground capitalize">
              {metrics.connectionHealth}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">{metrics.availableSymbols}</div>
              <div className="text-xs text-muted-foreground">Symbols</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">{metrics.activeSymbols}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <div>
              <div className="font-medium">{metrics.updateFrequency}ms</div>
              <div className="text-xs text-muted-foreground">Updates</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <div>
              <div className="font-medium">{metrics.rateLimit}</div>
              <div className="text-xs text-muted-foreground">Req/min</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {metrics.planOptimizations.slice(0, 3).map((optimization, index) => (
            <Badge key={index} variant="outline" className="text-xs px-2 py-1 bg-background/50">
              {optimization}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}