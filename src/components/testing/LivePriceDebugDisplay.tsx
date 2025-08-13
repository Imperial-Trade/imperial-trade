import React, { useEffect, useState } from "react";
import { useWebSocketPrices } from "@/contexts/WebSocketPriceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export const LivePriceDebugDisplay: React.FC = () => {
  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    subscribe,
    unsubscribe,
    getPrice,
  } = useWebSocketPrices();

  const [testSymbols] = useState([
    "XAUUSD",
    "BTCUSD",
    "USA30USD",
    "NAS100USD",
    "EURUSD",
  ]);

  useEffect(() => {
    logger.log(
      "LivePriceDebugDisplay - Subscribing to test symbols:",
      testSymbols
    );
    subscribe(testSymbols);

    return () => {
      logger.log("LivePriceDebugDisplay - Unsubscribing from test symbols");
      unsubscribe(testSymbols);
    };
  }, [subscribe, unsubscribe, testSymbols]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "connecting":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "error":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const handleRefresh = () => {
    logger.log("LivePriceDebugDisplay - Manual refresh requested");
    unsubscribe(testSymbols);
    setTimeout(() => {
      subscribe(testSymbols);
    }, 1000);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Live Price Debug Display
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              {connectionStatus}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <div>Data Source: {dataSource}</div>
          <div>
            Last Updated:{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
          </div>
          <div>Active Symbols: {Object.keys(prices).length}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="border rounded-lg p-3">
            <h3 className="font-medium mb-2">Connection Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                Status: <span className="font-mono">{connectionStatus}</span>
              </div>
              <div>
                Source: <span className="font-mono">{dataSource}</span>
              </div>
              <div>
                Errors:{" "}
                <span className="font-mono">{Object.keys(errors).length}</span>
              </div>
              <div>
                Live Prices:{" "}
                <span className="font-mono">{Object.keys(prices).length}</span>
              </div>
            </div>
          </div>

          {/* Price Data */}
          <div className="border rounded-lg p-3">
            <h3 className="font-medium mb-2">Live Price Data</h3>
            {Object.keys(prices).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No price data available
                {connectionStatus === "connecting" && (
                  <div className="text-xs mt-1">Waiting for connection...</div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                {testSymbols.map((symbol) => {
                  const priceData = getPrice(symbol);
                  return (
                    <div
                      key={symbol}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="font-medium">{symbol}</div>
                      <div className="text-right">
                        {priceData ? (
                          <div>
                            <div className="font-mono text-lg">
                              ${priceData.price.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {priceData.change > 0 ? "+" : ""}
                              {priceData.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">No data</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="border border-red-500/20 rounded-lg p-3 bg-red-500/10">
              <h3 className="font-medium mb-2 text-red-300">Errors</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(errors).map(([key, error]) => (
                  <div key={key} className="font-mono text-red-200">
                    {key}: {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Data (for debugging) */}
          <details className="border rounded-lg">
            <summary className="p-3 cursor-pointer font-medium">
              Raw Data (Debug)
            </summary>
            <div className="p-3 pt-0">
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                {JSON.stringify(
                  { prices, connectionStatus, dataSource, errors },
                  null,
                  2
                )}
              </pre>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};

export default LivePriceDebugDisplay;
