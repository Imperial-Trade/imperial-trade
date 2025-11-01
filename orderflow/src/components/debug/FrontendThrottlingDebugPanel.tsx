import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { usePriceStalenessMonitor } from '@/hooks/usePriceStalenessMonitor';
import { Activity, Database, Monitor, Tv } from 'lucide-react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface FrontendThrottlingDebugPanelProps {
  symbols?: string[];
}

export const FrontendThrottlingDebugPanel: React.FC<FrontendThrottlingDebugPanelProps> = ({
  symbols = ['XAUUSD', 'BTCUSD', 'EURUSD']
}) => {
  const { 
    prices, 
    internalPrices, 
    uiThrottleMs, 
    connectionStatus,
    isConnected,
    getInternalPrice,
    getPrice
  } = useOptimizedWebSocketPrices();
  
  const [updateCount, setUpdateCount] = useState(0);
  
  // Monitor system status
  const stalenessStatus = usePriceStalenessMonitor(symbols[0]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (!isDevToolsEnabled()) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tv className="w-5 h-5" />
          Frontend Throttling (Smart TV Station)
        </CardTitle>
        <CardDescription>
          Backend delivers hyper-fast updates every 2s, Frontend smooths to {Math.round(uiThrottleMs/1000)}s for professional trading experience
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Database className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium">Backend Pipeline</p>
              <p className="text-sm text-muted-foreground">Always Fresh (~2s)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Monitor className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-medium">UI Layer</p>
              <p className="text-sm text-muted-foreground">Throttled ({Math.round(uiThrottleMs/1000)}s)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Activity className="w-8 h-8 text-orange-500" />
            <div>
              <p className="font-medium">Connection</p>
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {connectionStatus}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Price Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Live Price Comparison</h3>
          <div className="space-y-2">
            {symbols.slice(0, 3).map(symbol => {
              const uiPrice = getPrice(symbol);
              const internalPrice = getInternalPrice(symbol);
              const priceDiff = (uiPrice && internalPrice) 
                ? Math.abs(uiPrice.price - internalPrice.price)
                : 0;
              const isThrottled = priceDiff > 0.0001;
              
              return (
                <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{symbol}</span>
                    {isThrottled && (
                      <Badge variant="secondary" className="text-xs">
                        Throttled
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">UI: ${uiPrice?.price.toFixed(4) || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">User Sees</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Internal: ${internalPrice?.price.toFixed(4) || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Always Fresh</p>
                    </div>
                    {priceDiff > 0.0001 && (
                      <div className="text-right">
                        <p className="font-medium text-orange-600">
                          Δ {priceDiff.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">Difference</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold">{Math.round(uiThrottleMs/1000)}s</p>
            <p className="text-sm text-muted-foreground">UI Update Interval</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold">{stalenessStatus.ageInSeconds || 0}s</p>
            <p className="text-sm text-muted-foreground">Data Age</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {stalenessStatus.dataFreshness.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">Status</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold">{Object.keys(internalPrices).length}</p>
            <p className="text-sm text-muted-foreground">Tracked Symbols</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Architecture Benefits</h4>
          <ul className="space-y-1 text-sm">
            <li>• Database always fresh (≤2s) - perfect for trading logic</li>
            <li>• UI updates smoothed to {Math.round(uiThrottleMs/1000)}s - professional calm experience</li>
            <li>• Backend runs at maximum efficiency - minimal compute costs</li>
            <li>• Critical price movements bypass throttling - instant visibility</li>
            <li>• Single parameter controls user experience - no backend changes needed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FrontendThrottlingDebugPanel;