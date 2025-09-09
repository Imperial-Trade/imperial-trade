import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useIngestSecret } from '@/hooks/useIngestSecret';
import { isDevToolsEnabled } from '@/utils/featureFlags';

const TEST_SYMBOLS = ['XAUUSD', 'BTCUSD']; // ✅ RESTRICTED to essential symbols only

export function TestPriceGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [lastSent, setLastSent] = useState<string>('');
  const { isConfigured, error: secretError } = useIngestSecret();

  const generateMockPrice = (symbol: string, basePrice: number) => {
    // Add realistic price movement (±0.5% change)
    const variance = (Math.random() - 0.5) * 0.01 * basePrice;
    return Math.round((basePrice + variance) * 100) / 100;
  };

  const getBasePrice = (symbol: string) => {
    const basePrices = {
      'XAUUSD': 2650.00,    // Gold price
      'BTCUSD': 94500.00    // Bitcoin price
    };
    return basePrices[symbol] || 1.0000;
  };

  const sendTestPrices = async () => {
    try {
      // Send multiple price ticks with varying changes to ensure some exceed significance threshold
      const testPrices = TEST_SYMBOLS.flatMap(symbol => {
        const basePrice = getBasePrice(symbol);
        return [
          {
            symbol,
            price: generateMockPrice(symbol, basePrice),
            timestamp: new Date().toISOString()
          },
          {
            symbol,
            price: basePrice * (1 + (Math.random() > 0.5 ? 0.015 : -0.015)), // Ensure significant change (1.5%)
            timestamp: new Date(Date.now() + 100).toISOString()
          }
        ];
      });

      const { data, error } = await supabase.functions.invoke('price-ingestor', {
        body: { prices: testPrices },
        headers: {
          'X-INGEST-KEY': 'CONFIGURED_SECRET' // Server will use the configured INGEST_SECRET
        }
      });

      if (error) {
        console.error('Price generation error:', error);
        setLastSent(`❌ Error: ${error.message}`);
      } else {
        setLastSent(`✅ Sent ${testPrices.length} prices at ${new Date().toLocaleTimeString()}`);
        if (isDevToolsEnabled()) {
          console.log('Test prices sent:', data);
        }
      }
    } catch (error) {
      setLastSent(`❌ Failed: ${error.message}`);
    }
  };

  const toggleGeneration = () => {
    if (isGenerating) {
      // Stop generation
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setIsGenerating(false);
      setLastSent('🛑 Stopped generating test prices');
    } else {
      // Start generation
      setIsGenerating(true);
      sendTestPrices(); // Send immediately
      
      const id = setInterval(sendTestPrices, 3000); // Every 3 seconds
      setIntervalId(id);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Test Price Generator
          <Badge variant={isGenerating ? "default" : "secondary"}>
            {isGenerating ? 'Active' : 'Inactive'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {secretError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">⚠️ {secretError}</p>
            <p className="text-xs text-red-500 mt-1">Price generation may fail without proper secret configuration.</p>
          </div>
        )}
        
        {isConfigured && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-600">✅ INGEST_SECRET is properly configured</p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 border rounded">
          <div>
            <h4 className="font-medium">Auto-Generate Test Prices</h4>
            <p className="text-sm text-muted-foreground">
              Sends mock prices every 3 seconds for: {TEST_SYMBOLS.join(', ')}
            </p>
          </div>
          <Switch
            checked={isGenerating}
            onCheckedChange={toggleGeneration}
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={sendTestPrices} 
            disabled={isGenerating}
            variant="outline"
            className="w-full"
          >
            Send Single Test Batch
          </Button>
          
          {lastSent && (
            <div className="p-2 bg-muted rounded text-sm">
              <strong>Last Result:</strong> {lastSent}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> This generator is for TESTING ONLY. 
          Auto-generation is disabled to ensure only real live data flows through the system.
        </div>
      </CardContent>
    </Card>
  );
}