import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMarketHours } from '@/hooks/useMarketHours';
import { useUltraCostOptimization } from '@/hooks/useUltraCostOptimization';
import { 
  TrendingDown, 
  Clock, 
  Activity,
  CheckCircle
} from 'lucide-react';

export const CostOptimizationWidget: React.FC = () => {
  const marketData = useMarketHours();
  const {
    isOptimized,
    projectedSavings,
    allowedSymbols,
    isEmergencyMode
  } = useUltraCostOptimization();

  const savingsColor = projectedSavings.percentage >= 70 
    ? 'text-green-600' 
    : projectedSavings.percentage >= 50 
    ? 'text-yellow-600' 
    : 'text-red-600';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-600" />
          Ultra-Cost Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Savings Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cost Savings</p>
            <p className={`text-2xl font-bold ${savingsColor}`}>
              {projectedSavings.percentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              ${projectedSavings.monthly}/month saved
            </p>
          </div>
          <Badge variant={isOptimized ? 'default' : 'secondary'}>
            {isOptimized ? 'OPTIMIZED' : 'NEEDS ATTENTION'}
          </Badge>
        </div>

        {/* Market Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">Market Status</p>
              <p className="text-xs text-muted-foreground">
                {marketData.formattedTimeUntilOpen || 'Market Open'}
              </p>
            </div>
          </div>
          <Badge variant={marketData.isOpen ? 'default' : 'secondary'}>
            {marketData.isOpen ? 'OPEN' : 'CLOSED'}
          </Badge>
        </div>

        {/* Active Optimizations */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Active Optimizations</p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Single TraderMade Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Redis Pub/Sub Distribution</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Market Hours Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>{allowedSymbols.length} Symbols ({allowedSymbols.join(', ')})</span>
            </div>
            {isEmergencyMode && (
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-red-600" />
                <span className="text-red-600">Emergency Mode Active</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};