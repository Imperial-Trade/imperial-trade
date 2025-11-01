import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUltraCostOptimization } from '@/hooks/useUltraCostOptimization';
import { DollarSign, TrendingDown, Zap, AlertTriangle } from 'lucide-react';

export const UltraCostOptimizationPanel = () => {
  const {
    isOptimized,
    projectedSavings,
    allowedSymbols,
    isEmergencyMode,
    enableEmergencyMode,
    resetMetrics
  } = useUltraCostOptimization();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Ultra-Cost Optimization
        </CardTitle>
        <Badge variant={isOptimized ? "default" : "destructive"}>
          {isOptimized ? "Optimized" : "Needs Attention"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Savings Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm">Projected Monthly Savings</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {projectedSavings.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                ${projectedSavings.monthly}/month
              </div>
            </div>
          </div>

          {/* Active Symbols */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Active Symbols (Cost Optimized)</span>
            </div>
            <div className="flex gap-2">
              {allowedSymbols.map(symbol => (
                <Badge key={symbol} variant="secondary" className="text-xs">
                  {symbol}
                </Badge>
              ))}
            </div>
          </div>

          {/* Emergency Mode */}
          {isEmergencyMode ? (
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                Emergency cost reduction active
              </span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={enableEmergencyMode}
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Enable Emergency Mode
            </Button>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetMetrics} className="flex-1">
              Reset Metrics
            </Button>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-medium">Cache Optimization</div>
              <div className="text-green-600">3x Longer TTL</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">Connection Pool</div>
              <div className="text-green-600">Dynamic Scaling</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">API Calls</div>
              <div className="text-green-600">60% Reduction</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">Database Ops</div>
              <div className="text-green-600">Batch Optimized</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};