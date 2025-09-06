import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUltraCostOptimization } from '@/hooks/useUltraCostOptimization';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';

export const UltraCostDashboard: React.FC = () => {
  const {
    isOptimized,
    projectedSavings,
    allowedSymbols,
    isEmergencyMode,
    enableEmergencyMode,
    resetMetrics
  } = useUltraCostOptimization();

  const savingsColor = projectedSavings.percentage >= 70 
    ? 'text-green-600' 
    : projectedSavings.percentage >= 50 
    ? 'text-yellow-600' 
    : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Ultra-Cost Optimization Dashboard</h2>
          <p className="text-muted-foreground">Real-time cost monitoring and optimization</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={resetMetrics}
            variant="outline"
            size="sm"
          >
            Reset Metrics
          </Button>
          {!isEmergencyMode && (
            <Button
              onClick={enableEmergencyMode}
              variant="destructive"
              size="sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Mode
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Optimization Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimization Status</CardTitle>
            {isOptimized ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={isOptimized ? 'default' : 'secondary'}>
                {isOptimized ? 'OPTIMIZED' : 'NEEDS ATTENTION'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 70% cost reduction
            </p>
          </CardContent>
        </Card>

        {/* Cost Savings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${savingsColor}`}>
              {projectedSavings.percentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              ${projectedSavings.monthly}/month saved
            </p>
            <Progress 
              value={projectedSavings.percentage} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        {/* Active Symbols */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Symbols</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allowedSymbols.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {allowedSymbols.join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* Emergency Mode */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Mode</CardTitle>
            {isEmergencyMode ? (
              <Zap className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={isEmergencyMode ? 'destructive' : 'default'}>
                {isEmergencyMode ? 'ACTIVE' : 'NORMAL'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Ultra-aggressive cost cutting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Features */}
      <Card>
        <CardHeader>
          <CardTitle>Active Optimizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Single TraderMade Connection</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Redis Pub/Sub Distribution</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Market Hours Detection</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Symbol Filtering (2 symbols)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Aggressive Caching (4x TTL)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Connection Pooling</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">TraderMade API Calls</h4>
                <p className="text-sm text-muted-foreground">Single connection, 2 symbols only</p>
              </div>
              <Badge variant="outline" className="text-green-600">
                90% reduction
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Redis Operations</h4>
                <p className="text-sm text-muted-foreground">Pub/Sub instead of polling</p>
              </div>
              <Badge variant="outline" className="text-green-600">
                90% reduction
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Database Connections</h4>
                <p className="text-sm text-muted-foreground">Connection pooling & batching</p>
              </div>
              <Badge variant="outline" className="text-green-600">
                70% reduction
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Edge Function Executions</h4>
                <p className="text-sm text-muted-foreground">Leader election & smart batching</p>
              </div>
              <Badge variant="outline" className="text-green-600">
                60% reduction
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};