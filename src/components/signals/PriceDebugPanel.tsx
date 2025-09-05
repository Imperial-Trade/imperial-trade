import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useHybridWebSocketPrices } from '@/contexts/HybridWebSocketPriceContext';

interface PriceDebugPanelProps {
  selectedAsset: { symbol: string; name: string } | null;
}

export const PriceDebugPanel: React.FC<PriceDebugPanelProps> = ({ selectedAsset }) => {
  const { prices, connectionStatus } = useHybridWebSocketPrices();
  
  const goldPrice = useOptimizedLivePrice('XAUUSD');
  const bitcoinPrice = useOptimizedLivePrice('BTCUSD');

  if (!selectedAsset) return null;

  const selectedSymbolPrice = prices[selectedAsset.symbol];

  return (
    <Card className="border-yellow-500/20 bg-yellow-50/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-yellow-600">🔍 Price Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span>Connection:</span>
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus}
          </Badge>
        </div>

        {/* Selected Asset Info */}
        <div className="border-t pt-2">
          <div className="font-medium text-yellow-700 mb-2">Selected: {selectedAsset.name} ({selectedAsset.symbol})</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Symbol Requested:</div>
            <div className="font-mono">{selectedAsset.symbol}</div>
            <div>Price Received:</div>
            <div className="font-mono">${selectedSymbolPrice?.price?.toFixed(2) || 'N/A'}</div>
            <div>Data Symbol:</div>
            <div className="font-mono">{selectedSymbolPrice?.symbol || 'N/A'}</div>
          </div>
        </div>

        {/* Gold vs Bitcoin Comparison */}
        <div className="border-t pt-2">
          <div className="font-medium text-yellow-700 mb-2">All Symbol Data:</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>XAUUSD (Gold):</span>
              <span className="font-mono">${goldPrice.price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>BTCUSD (Bitcoin):</span>
              <span className="font-mono">${bitcoinPrice.price?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Raw Context Data */}
        <div className="border-t pt-2">
          <div className="font-medium text-yellow-700 mb-2">Raw Context Prices:</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {Object.entries(prices).map(([symbol, data]) => (
              <div key={symbol} className="flex justify-between text-xs">
                <span className="font-mono">{symbol}:</span>
                <span className="font-mono">${data.price?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Check */}
        <div className="border-t pt-2">
          <div className="font-medium text-yellow-700 mb-1">Validation:</div>
          {selectedAsset.symbol === 'XAUUSD' && selectedSymbolPrice?.price > 50000 && (
            <div className="text-red-600 text-xs">⚠️ Gold showing Bitcoin-range price!</div>
          )}
          {selectedAsset.symbol === 'BTCUSD' && selectedSymbolPrice?.price < 50000 && (
            <div className="text-red-600 text-xs">⚠️ Bitcoin showing Gold-range price!</div>
          )}
          {selectedSymbolPrice?.symbol !== selectedAsset.symbol && (
            <div className="text-red-600 text-xs">⚠️ Symbol mismatch detected!</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};