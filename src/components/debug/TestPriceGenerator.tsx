import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const TEST_SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY'];

export function TestPriceGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [lastSent, setLastSent] = useState<string>('');
  const [secretKey, setSecretKey] = useState('');

  const generateMockPrice = (symbol: string, basePrice: number) => {
    // Add realistic price movement (±0.5% change)
    const variance = (Math.random() - 0.5) * 0.01 * basePrice;
    return Math.round((basePrice + variance) * 100) / 100;
  };

  const getBasePrice = (symbol: string) => {
    const basePrices = {
      'XAUUSD': 2650.00,
      'EURUSD': 1.0850,
      'GBPUSD': 1.2750,
      'BTCUSD': 94500.00,
      'USDJPY': 149.50
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
          'X-INGEST-KEY': secretKey || 'test-secret'
        }
      });

      if (error) {
        console.error('Price generation error:', error);
        setLastSent(`❌ Error: ${error.message}`);
      } else {
        setLastSent(`✅ Sent ${testPrices.length} prices at ${new Date().toLocaleTimeString()}`);
        console.log('Test prices sent:', data);
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
        <div className="space-y-2">
          <label className="text-sm font-medium">INGEST_SECRET (optional)</label>
          <input
            type="password"
            placeholder="Enter your INGEST_SECRET"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
          />
        </div>

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
          <strong>Note:</strong> This generator sends mock price data to test the pipeline. 
          Make sure your INGEST_SECRET matches the server configuration.
        </div>
      </CardContent>
    </Card>
  );
}