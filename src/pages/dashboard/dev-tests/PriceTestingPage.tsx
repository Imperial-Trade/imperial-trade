import React from 'react';
import { TestPriceGenerator } from '@/components/debug/TestPriceGenerator';

import { ZeroPausePriceDisplay } from '@/components/ui/price-display-zero-pause';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TEST_SYMBOLS = ['XAUUSD', 'BTCUSD']; // Restricted to essential symbols only

export default function PriceTestingPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🔧 Price Pipeline Testing</h1>
        <p className="text-muted-foreground">
          Test and debug the real-time price system end-to-end
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Price Generator */}
        <TestPriceGenerator />
        
        {/* Live Price Display Test */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Live Price Display Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TEST_SYMBOLS.map(symbol => (
              <div key={symbol} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{symbol}</span>
                <ZeroPausePriceDisplay 
                  symbol={symbol} 
                  showTimestamp={true}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}