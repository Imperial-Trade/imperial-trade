import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useTelemetry } from '@/contexts/TelemetryContext';

interface MessageRateStats {
  totalMessages: number;
  messagesPerHour: number;
  messagesPerMinute: number;
  breakdown: {
    priceUpdates: number;
    priceUpdatesV3: number;
    dbChanges: number;
    signalChanges: number;
    clampActivations: number;
  };
  costEstimate: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export const RealtimeMessageRateMonitor: React.FC = () => {
  const { counters, getStats, reset } = useTelemetry();
  const [messageStats, setMessageStats] = useState<MessageRateStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Calculate message rate statistics
  const calculateStats = (): MessageRateStats => {
    const stats = getStats();
    const totalMessages = stats.totalEvents;
    const messagesPerMinute = stats.eventsPerMinute;
    const messagesPerHour = messagesPerMinute * 60;

    // Cost calculation: $2.50 per million messages
    const costPerMessage = 2.50 / 1000000;
    const hourlyCost = messagesPerHour * costPerMessage;
    const dailyCost = hourlyCost * 24;
    const monthlyCost = dailyCost * 30;

    // Determine health status based on message rate
    let healthStatus: 'healthy' | 'warning' | 'critical';
    if (messagesPerHour < 1000) {
      healthStatus = 'healthy';
    } else if (messagesPerHour < 5000) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'critical';
    }

    return {
      totalMessages,
      messagesPerHour,
      messagesPerMinute,
      breakdown: {
        priceUpdates: counters.price_update,
        priceUpdatesV3: counters.price_update_v3,
        dbChanges: counters.db_change_v3,
        signalChanges: counters.signal_change_v3,
        clampActivations: counters.clamp_activation,
      },
      costEstimate: {
        hourly: hourlyCost,
        daily: dailyCost,
        monthly: monthlyCost,
      },
      healthStatus,
    };
  };

  // Update stats periodically when monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isMonitoring) {
      const updateStats = () => {
        setMessageStats(calculateStats());
      };

      updateStats(); // Initial calculation
      interval = setInterval(updateStats, 5000); // Update every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, counters]);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Realtime Message Rate Monitor</CardTitle>
            <CardDescription>
              Track realtime message consumption to optimize costs and performance
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isMonitoring ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                setMessageStats(null);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {messageStats ? (
          <>
            {/* Health Status */}
            <div className="flex items-center gap-2">
              {getHealthIcon(messageStats.healthStatus)}
              <Badge className={getHealthColor(messageStats.healthStatus)}>
                {messageStats.healthStatus.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">
                {messageStats.messagesPerHour.toFixed(0)} messages/hour
              </span>
            </div>

            {/* Message Rate Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {messageStats.totalMessages.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {messageStats.messagesPerMinute.toFixed(1)}
                </div>
                <div className="text-sm text-blue-600">Per Minute</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">
                  {messageStats.messagesPerHour.toFixed(0)}
                </div>
                <div className="text-sm text-orange-600">Per Hour</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  ${messageStats.costEstimate.monthly.toFixed(2)}
                </div>
                <div className="text-sm text-green-600">Monthly Cost</div>
              </div>
            </div>

            {/* Message Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Message Type Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm">Price Updates (v2)</span>
                  <Badge variant="outline">{messageStats.breakdown.priceUpdates.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm">Price Updates (v3)</span>
                  <Badge variant="outline">{messageStats.breakdown.priceUpdatesV3.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm">Database Changes</span>
                  <Badge variant="outline">{messageStats.breakdown.dbChanges.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm">Signal Changes</span>
                  <Badge variant="outline">{messageStats.breakdown.signalChanges.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm">Clamp Activations</span>
                  <Badge variant="outline">{messageStats.breakdown.clampActivations.toLocaleString()}</Badge>
                </div>
              </div>
            </div>

            {/* Cost Estimates */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Cost Estimates (Supabase Realtime)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ${messageStats.costEstimate.hourly.toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-600">Hourly</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ${messageStats.costEstimate.daily.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">Daily</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    ${messageStats.costEstimate.monthly.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Monthly</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {messageStats.healthStatus !== 'healthy' && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Optimization Recommendations</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {messageStats.messagesPerHour > 5000 && (
                    <li>• Critical: Message rate exceeds 5,000/hour - Check for subscription loops</li>
                  )}
                  {messageStats.messagesPerHour > 1000 && messageStats.messagesPerHour <= 5000 && (
                    <li>• Warning: High message rate - Consider optimizing telemetry sampling</li>
                  )}
                  {messageStats.breakdown.clampActivations > 100 && (
                    <li>• High clamp activations detected - Rate limiting is working</li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Click "Start Monitoring" to track realtime message rates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};