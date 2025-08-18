import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ConnectionHealthIndicatorProps {
  symbol?: string;
  onRefresh?: () => void;
  compact?: boolean;
}

export const ConnectionHealthIndicator: React.FC<ConnectionHealthIndicatorProps> = ({
  symbol,
  onRefresh,
  compact = false
}) => {
  const { connectionStatus, dataSource, lastUpdated, errors, priceUpdateSources, prices } = useWebSocketPrices();
  
  // Get symbol-specific info
  const symbolPrice = symbol ? prices[symbol] : null;
  const symbolSource = symbol ? priceUpdateSources[symbol] : undefined;
  const symbolError = symbol ? errors[symbol] : undefined;
  
  // Calculate data age
  const dataAge = symbolPrice?.timestamp 
    ? Math.floor((Date.now() - new Date(symbolPrice.timestamp).getTime()) / 1000)
    : null;
  
  // Determine overall health status
  const getHealthStatus = () => {
    if (connectionStatus === 'error' || symbolError) {
      return { status: 'error', color: 'destructive', icon: AlertTriangle };
    }
    
    if (connectionStatus === 'connecting') {
      return { status: 'connecting', color: 'secondary', icon: Activity };
    }
    
    if (connectionStatus === 'disconnected') {
      return { status: 'disconnected', color: 'destructive', icon: WifiOff };
    }
    
    if (dataAge && dataAge > 10) {
      return { status: 'stale', color: 'secondary', icon: RefreshCw };
    }
    
    if (symbolSource === 'http') {
      return { status: 'fallback', color: 'secondary', icon: Wifi };
    }
    
    return { status: 'healthy', color: 'default', icon: CheckCircle };
  };
  
  const health = getHealthStatus();
  
  const getStatusText = () => {
    switch (health.status) {
      case 'error':
        return symbolError || errors.global || 'Connection error';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'stale':
        return `Stale (${dataAge}s ago)`;
      case 'fallback':
        return 'REST API fallback';
      case 'healthy':
        return symbolSource === 'websocket_institutional' ? 'Institutional feed' : 'Live';
      default:
        return 'Unknown';
    }
  };
  
  const getDetailedInfo = () => {
    const info = [];
    
    info.push(`Status: ${connectionStatus}`);
    info.push(`Source: ${dataSource}`);
    
    if (symbol) {
      info.push(`Symbol: ${symbol}`);
      if (symbolPrice) {
        info.push(`Price: $${symbolPrice.price}`);
        info.push(`Last Update: ${new Date(symbolPrice.timestamp).toLocaleTimeString()}`);
        info.push(`Data Age: ${dataAge}s`);
      }
      if (symbolSource) {
        info.push(`Feed Type: ${symbolSource}`);
      }
    }
    
    if (lastUpdated) {
      info.push(`Last Message: ${lastUpdated.toLocaleTimeString()}`);
    }
    
    // Show errors
    const allErrors = Object.entries(errors);
    if (allErrors.length > 0) {
      info.push('---');
      allErrors.forEach(([key, error]) => {
        info.push(`${key}: ${error}`);
      });
    }
    
    return info.join('\n');
  };
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <health.icon className="h-3 w-3" />
              {dataAge !== null && (
                <span className="text-xs text-muted-foreground">
                  {dataAge < 60 ? `${dataAge}s` : `${Math.floor(dataAge / 60)}m`}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <pre className="text-xs whitespace-pre-wrap">{getDetailedInfo()}</pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={health.color as any} className="flex items-center gap-1">
              <health.icon className="h-3 w-3" />
              <span className="text-xs">{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <pre className="text-xs whitespace-pre-wrap">{getDetailedInfo()}</pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-6 w-6 p-0"
          disabled={connectionStatus === 'connecting'}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};