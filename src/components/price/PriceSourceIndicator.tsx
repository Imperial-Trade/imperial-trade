import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Info, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { usePriceSourceVerification } from "@/hooks/usePriceSourceVerification";

interface PriceSourceIndicatorProps {
  symbol: string;
  priceData: {
    price: number;
    bid: number;
    ask: number;
    timestamp: number;
    source?: string;
  } | null;
  showDetails?: boolean;
  className?: string;
}

export function PriceSourceIndicator({ 
  symbol, 
  priceData, 
  showDetails = false,
  className = "" 
}: PriceSourceIndicatorProps) {
  const verification = usePriceSourceVerification(symbol, priceData);
  
  const getConnectionStatusIcon = () => {
    if (verification.sourceHealth.isConnected) {
      return <Wifi className="h-3 w-3 text-emerald-500" />;
    }
    return <WifiOff className="h-3 w-3 text-destructive" />;
  };

  const getDataQualityColor = () => {
    switch (verification.sourceHealth.dataQuality) {
      case 'excellent': return 'bg-emerald-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getConfidenceColor = () => {
    if (!verification.priceValidation) return 'secondary';
    switch (verification.priceValidation.confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Source Information Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                {getConnectionStatusIcon()}
                <span className="ml-1">{verification.sourceInfo.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-xs">
                <div><strong>Type:</strong> {verification.sourceInfo.type}</div>
                <div><strong>Category:</strong> {verification.sourceInfo.category}</div>
                <div><strong>Latency:</strong> {verification.sourceInfo.latency}</div>
                <div>{verification.sourceInfo.description}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Badge variant={getConfidenceColor()} className="text-xs">
          {verification.priceValidation?.confidence || 'unknown'} confidence
        </Badge>

        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${getDataQualityColor()}`} />
          <span className="text-xs text-muted-foreground">
            {verification.sourceHealth.dataQuality}
          </span>
        </div>
      </div>

      {/* Spread Information */}
      {verification.spreadMetrics && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>
            Spread: {verification.spreadMetrics.spread.toFixed(symbol === 'EURUSD' ? 5 : 2)} 
            ({verification.spreadMetrics.spreadBps.toFixed(1)}bps)
          </span>
          {verification.spreadMetrics.isWideSpread && (
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
          )}
        </div>
      )}

      {/* Health Metrics (if detailed view) */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Update Rate:</span>
              <span>{verification.sourceHealth.updateFrequency.toFixed(1)}/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Latency:</span>
              <span>{verification.sourceHealth.averageLatency.toFixed(0)}ms</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success Rate:</span>
              <span>{verification.sourceHealth.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update:</span>
              <span>
                {verification.sourceHealth.lastUpdate 
                  ? `${Math.round((Date.now() - verification.sourceHealth.lastUpdate) / 1000)}s ago`
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(verification.spreadAlerts.length > 0 || verification.priceAlerts.length > 0) && (
        <div className="space-y-1">
          {verification.spreadAlerts.map((alert, index) => (
            <Alert key={`spread-${index}`} className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">{alert}</AlertDescription>
            </Alert>
          ))}
          {verification.priceAlerts.map((alert, index) => (
            <Alert key={`price-${index}`} className="py-2">
              <Info className="h-3 w-3" />
              <AlertDescription className="text-xs">{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Health Status Summary */}
      {!verification.isSpreadHealthy || !verification.isPriceHealthy ? (
        <Alert className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {!verification.isSpreadHealthy && "Wide spread detected. "}
            {!verification.isPriceHealthy && "Price quality concerns detected. "}
            Consider checking alternative data sources.
          </AlertDescription>
        </Alert>
      ) : (
        verification.sourceHealth.isConnected && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            <span>Price source healthy</span>
          </div>
        )
      )}
    </div>
  );
}