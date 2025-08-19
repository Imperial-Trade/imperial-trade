// Business Plan Performance Indicator Component

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { useBusinessPlanOptimization } from '@/hooks/useBusinessPlanOptimization';

export const BusinessPlanIndicator: React.FC = () => {
  const { 
    metrics, 
    performanceGrade, 
    isOptimized, 
    recommendations, 
    refreshMetrics, 
    resetMetrics 
  } = useBusinessPlanOptimization();

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'bg-success text-success-foreground';
      case 'good': return 'bg-primary text-primary-foreground';
      case 'fair': return 'bg-warning text-warning-foreground';
      case 'poor': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4" />;
      case 'good': return <TrendingUp className="h-4 w-4" />;
      case 'fair': return <Activity className="h-4 w-4" />;
      case 'poor': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            TraderMade Business Plan
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getGradeColor(performanceGrade)}>
              {getGradeIcon(performanceGrade)}
              {performanceGrade.toUpperCase()}
            </Badge>
            {isOptimized && (
              <Badge variant="outline" className="text-success border-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Optimized
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Quota Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Quota Usage</span>
            <span className="font-medium">
              {metrics.apiQuotaUsed.toLocaleString()} / {metrics.apiQuotaLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={metrics.quotaUtilization} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {metrics.quotaUtilization.toFixed(1)}% utilized
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Avg Latency
            </div>
            <div className="text-lg font-semibold">
              {metrics.avgLatency.toFixed(0)}ms
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              Updates/sec
            </div>
            <div className="text-lg font-semibold">
              {metrics.priceUpdatesPerSecond.toFixed(1)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Cache Hit Rate
            </div>
            <div className="text-lg font-semibold">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Error Rate
            </div>
            <div className="text-lg font-semibold">
              {metrics.errorRate.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Ultra-Fast Ticks Counter */}
        {(metrics.ultraFastTicksReceived > 0 || metrics.institutionalTicksReceived > 0) && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="text-sm font-medium mb-2">Business Plan Features Active</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">⚡ Ultra-Fast Ticks</span>
                <span className="font-semibold text-primary">
                  {metrics.ultraFastTicksReceived.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">💎 Institutional Ticks</span>
                <span className="font-semibold text-primary">
                  {metrics.institutionalTicksReceived.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Optimization Recommendations:
            </div>
            <ul className="text-sm space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 text-warning flex-shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshMetrics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetMetrics}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        {/* Connection Uptime */}
        <div className="text-xs text-muted-foreground text-center">
          Connection uptime: {Math.floor(metrics.connectionUptime / 60)}m {Math.floor(metrics.connectionUptime % 60)}s
        </div>
      </CardContent>
    </Card>
  );
};