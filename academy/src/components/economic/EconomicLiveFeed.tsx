import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Clock, Wifi, WifiOff } from 'lucide-react';
import { useEconomicRealtime } from '@/contexts/EconomicRealtimeContext';
import { EconomicEventCountdown } from './EconomicEventCountdown';
import { format } from 'date-fns';

export const EconomicLiveFeed: React.FC = () => {
  const { 
    upcomingEvents, 
    highImpactEvents, 
    connectionStatus, 
    lastUpdate 
  } = useEconomicRealtime();

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConnectionIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className="h-4 w-4" />;
    }
    return <WifiOff className="h-4 w-4" />;
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📊';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Live Economic Feed
          </CardTitle>
          <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
            {getConnectionIcon()}
            <span className="text-sm font-medium capitalize">
              {connectionStatus}
            </span>
          </div>
        </div>
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            Last updated: {format(lastUpdate, 'HH:mm:ss')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Events Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Next 24 Hours ({upcomingEvents.length})</h3>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No upcoming events in the next 24 hours
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getImpactIcon(event.impact)}</span>
                      <Badge variant={getImpactColor(event.impact)} className="text-xs">
                        {event.currency}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.impact.toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm truncate">{event.event}</h4>
                    <p className="text-xs text-muted-foreground">
                      {event.time} • {event.description}
                    </p>
                    {(event.forecast || event.previous) && (
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {event.forecast && <span>Forecast: {event.forecast}</span>}
                        {event.previous && <span>Previous: {event.previous}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <EconomicEventCountdown 
                      event={event} 
                      variant="compact"
                      showIcon={false}
                    />
                  </div>
                </div>
              ))}
              
              {upcomingEvents.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{upcomingEvents.length - 5} more events
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* High Impact Events Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-sm">High Impact Today ({highImpactEvents.length})</h3>
          </div>
          
          {highImpactEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No high impact events today
            </p>
          ) : (
            <div className="grid gap-2">
              {highImpactEvents.slice(0, 3).map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🔥</span>
                      <Badge variant="destructive" className="text-xs">
                        {event.currency}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    </div>
                    <h4 className="font-medium text-sm truncate">{event.event}</h4>
                    {event.actual && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs">
                          Actual: {event.actual}
                        </Badge>
                        {event.forecast && (
                          <span className="text-xs text-muted-foreground">
                            vs {event.forecast} forecast
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {highImpactEvents.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{highImpactEvents.length - 3} more high impact events
                </p>
              )}
            </div>
          )}
        </div>

        {/* Connection Status Info */}
        {connectionStatus === 'error' && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              Connection error. Real-time updates may be delayed.
            </p>
          </div>
        )}
        
        {connectionStatus === 'connecting' && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Connecting to real-time updates...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};